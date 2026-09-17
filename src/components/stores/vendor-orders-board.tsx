"use client";

import { AnimatePresence, m } from "framer-motion";
import { AlertTriangle, CalendarClock, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition, type FormEvent, type ReactNode } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { FadeIn } from "@/components/ui/fade-in";
import { GlassCard } from "@/components/ui/glass-card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { VendorOrderTicket, formatOrderWhen } from "@/components/stores/vendor-order-ticket";
import { VendorThermalReceipt } from "@/components/stores/vendor-thermal-receipt";
import { VendorOrdersPagination } from "@/components/stores/vendor-orders-pagination";
import {
  advanceVendorOrderAction,
  cancelVendorOrderAction,
  quoteCustomOrderAction,
} from "@/lib/stores/actions";
import {
  addDineInExtraItemAction,
  serveAllDineInItemsAction,
  toggleDineInItemAction,
} from "@/lib/stores/dine-in-pos-actions";
import { formatCountdown, isVendorPrepAlert } from "@/lib/stores/custom-order";
import { VENDOR_ORDER_FILTERS, type VendorOrderFilter } from "@/lib/stores/order-status";
import type { VendorOrderRecord } from "@/lib/stores/order-types";
import { formatMoney, PRICE_CURRENCY } from "@/lib/stores/pricing";
import type { ProductRecord, StoreRecord } from "@/lib/stores/types";
import {
  EMPTY_VENDOR_CHANNEL_COUNTS,
  EMPTY_VENDOR_ORDER_COUNTS,
  VENDOR_ORDER_SOURCES,
  vendorOrdersHref,
  type VendorChannelCounts,
  type VendorOrderCounts,
  type VendorOrderSource,
} from "@/lib/stores/vendor-order-query";
import { cn } from "@/lib/utils";
import { useVendorOrdersStore } from "@/stores/vendor-orders-store";

const fieldClass =
  "h-24 w-full rounded-lg border border-border bg-background/70 px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
const inputClass =
  "h-10 w-full rounded-xl border border-border bg-background/70 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const STATUS_COUNT_CLASS: Record<VendorOrderFilter, string> = {
  ALL: "bg-muted text-muted-foreground",
  PENDING_QUOTE: "bg-warning/20 text-warning-foreground dark:text-warning",
  PENDING:
    "bg-destructive text-destructive-foreground shadow-[0_0_14px_oklch(0.63_0.22_25/0.6)]",
  PREPARING: "bg-amber-500 text-white",
  READY_FOR_PICKUP: "bg-emerald-500 text-white",
  DELIVERED: "bg-muted text-muted-foreground",
};

export function VendorOrdersBoard({
  store,
  orders,
  quotes = [],
  prepAlerts = [],
  products = [],
  total,
  page,
  pageSize,
  counts = EMPTY_VENDOR_ORDER_COUNTS,
  channelCounts = EMPTY_VENDOR_CHANNEL_COUNTS,
  status,
  orderSource,
}: {
  store: StoreRecord | null;
  orders: VendorOrderRecord[];
  quotes?: VendorOrderRecord[];
  prepAlerts?: VendorOrderRecord[];
  products?: ProductRecord[];
  total: number;
  page: number;
  pageSize: number;
  counts?: VendorOrderCounts;
  channelCounts?: VendorChannelCounts;
  status: VendorOrderFilter;
  orderSource: VendorOrderSource;
}): ReactNode {
  const { t, locale } = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const liveOrders = useVendorOrdersStore((state) => state.orders);
  const hydrate = useVendorOrdersStore((state) => state.hydrate);
  const replaceOrder = useVendorOrdersStore((state) => state.replaceOrder);
  const patchOrder = useVendorOrdersStore((state) => state.patchOrder);
  const [error, setError] = useState<string | null>(null);
  const [canceling, setCanceling] = useState<VendorOrderRecord | null>(null);
  const [addingTo, setAddingTo] = useState<VendorOrderRecord | null>(null);
  const [pending, startTransition] = useTransition();
  const [posBusy, setPosBusy] = useState<string | null>(null);
  const [quoteDrafts, setQuoteDrafts] = useState<Record<string, string>>({});
  const [printing, setPrinting] = useState<VendorOrderRecord | null>(null);
  const closePrint = useCallback(() => setPrinting(null), []);

  useEffect(() => {
    hydrate(orders, counts);
  }, [counts, hydrate, orders]);

  const visible = liveOrders.length > 0 ? liveOrders : orders;
  const visiblePrepAlerts = useMemo(
    () => prepAlerts.filter((order) => isVendorPrepAlert(order.scheduledDate)),
    [prepAlerts],
  );
  const channelQuotes = status === "PENDING_QUOTE" ? [] : quotes;

  if (!store) {
    return (
      <FadeIn>
        <PageHeader title={t("vendor.orders")} description={t("vendor.noStore")} />
      </FadeIn>
    );
  }

  const advance = (orderId: string): void => {
    const formData = new FormData();
    formData.set("storeId", store.id);
    formData.set("id", orderId);
    startTransition(async () => {
      const result = await advanceVendorOrderAction(formData);
      if (!result.ok) {
        setError(result.error ?? "Failed.");
        return;
      }
      setError(null);
      router.refresh();
    });
  };

  const cancel = (orderId: string, reason: string): void => {
    const formData = new FormData();
    formData.set("storeId", store.id);
    formData.set("id", orderId);
    formData.set("reason", reason);
    startTransition(async () => {
      const result = await cancelVendorOrderAction(formData);
      if (!result.ok) {
        setError(result.error ?? "Failed.");
        return;
      }
      setError(null);
      setCanceling(null);
      router.refresh();
    });
  };

  const quote = (orderId: string): void => {
    const formData = new FormData();
    formData.set("storeId", store.id);
    formData.set("id", orderId);
    formData.set("quotedPrice", quoteDrafts[orderId] ?? "");
    startTransition(async () => {
      const result = await quoteCustomOrderAction(formData);
      if (!result.ok) {
        setError(result.error ?? "Failed.");
        return;
      }
      setError(null);
      router.refresh();
    });
  };

  const runPos = (
    key: string,
    optimistic: () => void,
    task: () => Promise<{ ok: boolean; error?: string; order?: VendorOrderRecord }>,
    rollback: VendorOrderRecord,
  ): void => {
    optimistic();
    setPosBusy(key);
    void task().then((result) => {
      setPosBusy(null);
      if (!result.ok || !result.order) {
        replaceOrder(rollback);
        setError(result.error ?? "Failed.");
        return;
      }
      setError(null);
      replaceOrder(result.order);
    });
  };

  const toggleItem = (order: VendorOrderRecord, itemId: string): void => {
    const formData = new FormData();
    formData.set("storeId", store.id);
    formData.set("orderId", order.id);
    formData.set("itemId", itemId);
    runPos(
      `${order.id}:${itemId}`,
      () => {
        patchOrder(order.id, (current) => {
          const items = current.items.map((item) =>
            item.id === itemId
              ? { ...item, status: item.status === "SERVED" ? ("PENDING" as const) : ("SERVED" as const) }
              : item,
          );
          const allServed = items.length > 0 && items.every((item) => item.status === "SERVED");
          return {
            ...current,
            items,
            status: allServed ? "DELIVERED" : current.status === "DELIVERED" ? "PREPARING" : current.status,
          };
        });
      },
      () => toggleDineInItemAction(formData),
      order,
    );
  };

  const serveAll = (order: VendorOrderRecord): void => {
    const formData = new FormData();
    formData.set("storeId", store.id);
    formData.set("orderId", order.id);
    runPos(
      `${order.id}:all`,
      () => {
        patchOrder(order.id, (current) => ({
          ...current,
          items: current.items.map((item) => ({ ...item, status: "SERVED" })),
          status: current.items.length > 0 ? "DELIVERED" : current.status,
        }));
      },
      () => serveAllDineInItemsAction(formData),
      order,
    );
  };

  return (
    <FadeIn className="space-y-6">
      <div className="space-y-6 print:hidden">
      <PageHeader title={t("vendor.orders")} description={t("vendor.ordersDesc")} />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        {VENDOR_ORDER_SOURCES.map((value) => (
          <Link
            key={value}
            href={vendorOrdersHref(pathname, { status, orderSource: value, page: 1 })}
            scroll={false}
            className={buttonVariants({
              size: "sm",
              variant: orderSource === value ? "default" : "outline",
            })}
          >
            {t(`vendor.channel.${value}`)}
            <span
              className={cn(
                "ms-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                orderSource === value ? "bg-primary-foreground/15" : "bg-muted text-muted-foreground",
              )}
            >
              {channelCounts[value]}
            </span>
          </Link>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {VENDOR_ORDER_FILTERS.map((value) => {
          const count = counts[value];
          return (
            <Link
              key={value}
              href={vendorOrdersHref(pathname, { status: value, orderSource, page: 1 })}
              scroll={false}
              className={buttonVariants({
                size: "sm",
                variant: status === value ? "default" : "outline",
              })}
            >
              {t(`vendor.filter.${value}`)}
              <span
                className={cn(
                  "ms-1 inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                  STATUS_COUNT_CLASS[value],
                  value === "PENDING" && count > 0 && "animate-pulse",
                )}
              >
                {count}
              </span>
            </Link>
          );
        })}
      </div>

      {visiblePrepAlerts.length > 0 ? (
        <div className="space-y-2">
          {visiblePrepAlerts.map((order) => (
            <GlassCard key={`alert-${order.id}`} hover={false} className="flex items-start gap-3 border-warning/40">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" />
              <div>
                <p className="text-sm font-semibold">{t("vendor.prepAlertTitle", { orderNumber: order.orderNumber })}</p>
                <p className="text-xs text-muted-foreground">
                  {t("vendor.prepAlertBody", {
                    when: order.scheduledDate ? formatOrderWhen(order.scheduledDate, locale) : "—",
                    left: formatCountdown(
                      (order.scheduledDate ? new Date(order.scheduledDate).getTime() : Date.now()) - Date.now(),
                      locale,
                    ),
                  })}
                </p>
              </div>
            </GlassCard>
          ))}
        </div>
      ) : null}

      {channelQuotes.length > 0 ? (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 font-heading text-base font-semibold">
            <Sparkles className="size-4 text-primary" />
            {t("vendor.customQuoteQueue")}
          </h2>
          {channelQuotes.map((order) => (
            <CustomQuoteCard
              key={order.id}
              order={order}
              locale={locale}
              pending={pending}
              price={quoteDrafts[order.id] ?? ""}
              onPrice={(value) => setQuoteDrafts((current) => ({ ...current, [order.id]: value }))}
              onQuote={() => quote(order.id)}
              onCancel={() => setCanceling(order)}
            />
          ))}
        </section>
      ) : null}

      {visible.length === 0 ? (
        <GlassCard hover={false}>
          <p className="text-sm text-muted-foreground">{t("vendor.emptyOrders")}</p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {visible.map((order) => {
            if (order.status === "PENDING_QUOTE") {
              return (
                <CustomQuoteCard
                  key={order.id}
                  order={order}
                  locale={locale}
                  pending={pending}
                  price={quoteDrafts[order.id] ?? ""}
                  onPrice={(value) => setQuoteDrafts((current) => ({ ...current, [order.id]: value }))}
                  onQuote={() => quote(order.id)}
                  onCancel={() => setCanceling(order)}
                />
              );
            }
            return (
              <VendorOrderTicket
                key={order.id}
                order={order}
                locale={locale}
                pending={pending}
                posBusy={posBusy !== null}
                onToggleItem={(itemId) => toggleItem(order, itemId)}
                onServeAll={() => serveAll(order)}
                onAddItem={() => setAddingTo(order)}
                onAdvance={() => advance(order.id)}
                onCancel={() => setCanceling(order)}
                onPrint={() => setPrinting(order)}
              />
            );
          })}
        </div>
      )}

      <VendorOrdersPagination
        pathname={pathname}
        page={page}
        pageSize={pageSize}
        total={total}
        status={status}
        orderSource={orderSource}
      />

      <CancelOrderDialog
        order={canceling}
        pending={pending}
        onClose={() => setCanceling(null)}
        onConfirm={(reason) => {
          if (canceling) {
            cancel(canceling.id, reason);
          }
        }}
      />
      <AddTableItemDialog
        order={addingTo}
        products={products}
        pending={posBusy !== null}
        onClose={() => setAddingTo(null)}
        onAdded={(order) => {
          replaceOrder(order);
          setAddingTo(null);
        }}
        onError={setError}
        storeId={store.id}
        setBusy={setPosBusy}
        patchOrder={patchOrder}
      />
      </div>
      {printing ? (
        <VendorThermalReceipt store={store} order={printing} onClose={closePrint} />
      ) : null}
    </FadeIn>
  );
}

function CancelOrderDialog({
  order,
  pending,
  onClose,
  onConfirm,
}: {
  order: VendorOrderRecord | null;
  pending: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}): ReactNode {
  const { t } = useLocale();
  const [reason, setReason] = useState("");

  useEffect(() => {
    setReason("");
  }, [order?.id]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    onConfirm(reason.trim());
  };

  return (
    <AnimatePresence>
      {order ? (
        <m.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-background/55 backdrop-blur-sm"
            aria-label={t("common.cancel")}
            onClick={onClose}
          />
          <m.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full max-w-md"
          >
            <GlassCard hover={false} className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-heading text-lg font-semibold">{t("vendor.cancelOrder")}</h2>
                  <p className="text-xs text-muted-foreground">{order.orderNumber}</p>
                </div>
                <Button variant="ghost" size="icon-sm" onPress={onClose}>
                  <X />
                </Button>
              </div>
              <form className="space-y-3" onSubmit={handleSubmit} key={order.id}>
                <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
                  {t("vendor.cancelReason")}
                  <textarea
                    required
                    minLength={3}
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder={t("vendor.cancelReasonHint")}
                    className={fieldClass}
                  />
                </label>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" type="button" onPress={onClose}>
                    {t("common.cancel")}
                  </Button>
                  <Button variant="destructive" type="submit" isDisabled={pending || reason.trim().length < 3}>
                    {t("vendor.confirmCancel")}
                  </Button>
                </div>
              </form>
            </GlassCard>
          </m.div>
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}

function CustomQuoteCard({
  order,
  locale,
  pending,
  price,
  onPrice,
  onQuote,
  onCancel,
}: {
  order: VendorOrderRecord;
  locale: string;
  pending: boolean;
  price: string;
  onPrice: (value: string) => void;
  onQuote: () => void;
  onCancel: () => void;
}): ReactNode {
  const { t } = useLocale();
  const quoteValue = Number.parseFloat(price);

  return (
    <GlassCard hover={false} className="space-y-4 print:hidden">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="font-heading text-lg font-semibold tracking-tight">{order.orderNumber}</p>
          <p className="text-xs text-muted-foreground">{formatOrderWhen(order.createdAt, locale)}</p>
        </div>
        <StatusBadge
          label={t(`status.order.${order.status}`)}
          tone="warning"
          className="normal-case tracking-normal"
        />
      </div>
      {order.customImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={order.customImage} alt="" className="h-44 w-full rounded-2xl object-cover" />
      ) : null}
      <div className="space-y-2 text-sm">
        <p>
          <span className="text-muted-foreground">{t("vendor.customer")}: </span>
          {order.customerName} · {order.customerPhone}
        </p>
        {order.scheduledDate ? (
          <p className="flex items-center gap-1.5">
            <CalendarClock className="size-3.5 text-primary" />
            {t("vendor.scheduledFor")}: {formatOrderWhen(order.scheduledDate, locale)}
          </p>
        ) : null}
        {order.customNotes ? <p className="rounded-xl bg-muted/50 px-3 py-2">{order.customNotes}</p> : null}
        <p>
          <span className="text-muted-foreground">{t("menu.address")}: </span>
          {order.addressText}
        </p>
      </div>
      <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
        {t("vendor.quotedPrice")}
        <input
          inputMode="decimal"
          value={price}
          onChange={(event) => onPrice(event.target.value)}
          placeholder="0"
          className="h-10 w-full rounded-lg border border-border bg-background/70 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button onPress={onQuote} isDisabled={pending || !Number.isFinite(quoteValue) || quoteValue <= 0}>
          {t("vendor.sendQuote")}
        </Button>
        <Button variant="destructive" onPress={onCancel} isDisabled={pending}>
          {t("vendor.cancelOrder")}
        </Button>
      </div>
    </GlassCard>
  );
}

function AddTableItemDialog({
  order,
  products,
  pending,
  storeId,
  onClose,
  onAdded,
  onError,
  setBusy,
  patchOrder,
}: {
  order: VendorOrderRecord | null;
  products: ProductRecord[];
  pending: boolean;
  storeId: string;
  onClose: () => void;
  onAdded: (order: VendorOrderRecord) => void;
  onError: (error: string | null) => void;
  setBusy: (key: string | null) => void;
  patchOrder: (orderId: string, patch: (order: VendorOrderRecord) => VendorOrderRecord) => void;
}): ReactNode {
  const { t } = useLocale();
  const [mode, setMode] = useState<"catalog" | "custom">("catalog");
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("0");

  useEffect(() => {
    setMode("catalog");
    setQuery("");
    setName("");
    setPrice("0");
  }, [order?.id]);

  const available = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return products
      .filter((product) => product.available)
      .filter((product) => !needle || product.name.toLowerCase().includes(needle))
      .slice(0, 12);
  }, [products, query]);

  const submit = (input: { productId?: string; name?: string; unitPrice?: number }): void => {
    if (!order) {
      return;
    }
    const snapshot = order;
    const formData = new FormData();
    formData.set("storeId", storeId);
    formData.set("orderId", order.id);
    if (input.productId) {
      formData.set("productId", input.productId);
    }
    if (input.name) {
      formData.set("name", input.name);
    }
    formData.set("unitPrice", String(input.unitPrice ?? 0));
    formData.set("quantity", "1");

    const optimisticName = input.name ?? products.find((product) => product.id === input.productId)?.name ?? "";
    const optimisticPrice = input.unitPrice ?? 0;
    patchOrder(order.id, (current) => {
      const items = [
        ...current.items,
        {
          id: `temp-${Date.now()}`,
          name: optimisticName,
          quantity: 1,
          unitPrice: optimisticPrice,
          status: "PENDING" as const,
        },
      ];
      return {
        ...current,
        items,
        total: items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
        status: current.status === "DELIVERED" ? "PREPARING" : current.status,
      };
    });
    setBusy(`${order.id}:add`);
    void addDineInExtraItemAction(formData).then((result) => {
      setBusy(null);
      if (!result.ok || !result.order) {
        patchOrder(snapshot.id, () => snapshot);
        onError(result.error ?? "Failed.");
        return;
      }
      onError(null);
      onAdded(result.order);
    });
  };

  return (
    <AnimatePresence>
      {order ? (
        <m.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-background/55 backdrop-blur-sm"
            aria-label={t("common.cancel")}
            onClick={onClose}
          />
          <m.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full max-w-md"
          >
            <GlassCard hover={false} className="max-h-[86dvh] space-y-4 overflow-y-auto">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-heading text-lg font-semibold">{t("vendor.addTableItemTitle")}</h2>
                  <p className="text-xs text-muted-foreground">{order.orderNumber}</p>
                </div>
                <Button variant="ghost" size="icon-sm" onPress={onClose}>
                  <X />
                </Button>
              </div>
              <div className="flex rounded-full bg-muted/70 p-0.5">
                {(["catalog", "custom"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setMode(value)}
                    className={cn(
                      "flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                      mode === value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
                    )}
                  >
                    {t(value === "catalog" ? "vendor.catalogPick" : "vendor.customItem")}
                  </button>
                ))}
              </div>
              {mode === "catalog" ? (
                <div className="space-y-2">
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={t("vendor.searchCatalog")}
                    className={inputClass}
                  />
                  {available.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("vendor.emptyCatalog")}</p>
                  ) : (
                    <ul className="max-h-64 space-y-1 overflow-y-auto">
                      {available.map((product) => (
                        <li key={product.id}>
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() =>
                              submit({
                                productId: product.id,
                                name: product.name,
                                unitPrice: product.hasDiscount && product.discountPrice != null
                                  ? product.discountPrice
                                  : product.price,
                              })
                            }
                            className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-start text-sm hover:bg-muted/70"
                          >
                            <span className="truncate">{product.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatMoney(
                                product.hasDiscount && product.discountPrice != null
                                  ? product.discountPrice
                                  : product.price,
                              )}{" "}
                              {PRICE_CURRENCY}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <form
                  className="space-y-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    submit({ name: name.trim(), unitPrice: Number.parseFloat(price) || 0 });
                  }}
                >
                  <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
                    {t("vendor.customItemName")}
                    <input
                      required
                      minLength={2}
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      className={inputClass}
                    />
                  </label>
                  <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
                    {t("vendor.customItemPrice")}
                    <input
                      inputMode="decimal"
                      value={price}
                      onChange={(event) => setPrice(event.target.value)}
                      className={inputClass}
                    />
                  </label>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" type="button" onPress={onClose}>
                      {t("common.cancel")}
                    </Button>
                    <Button type="submit" isDisabled={pending || name.trim().length < 2}>
                      {t("common.add")}
                    </Button>
                  </div>
                </form>
              )}
            </GlassCard>
          </m.div>
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}
