"use client";

import { AnimatePresence, m } from "framer-motion";
import { AlertTriangle, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition, type FormEvent, type ReactNode } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/ui/fade-in";
import { GlassCard } from "@/components/ui/glass-card";
import { PageHeader } from "@/components/ui/page-header";
import { formatOrderWhen } from "@/components/stores/vendor-order-ticket";
import { VendorOrderWorkspace, type VendorQueueLane } from "@/components/stores/vendor-order-workspace";
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
import { type VendorOrderFilter } from "@/lib/stores/order-status";
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

const FILTER_DOT: Record<VendorOrderFilter, string> = {
  ALL: "bg-primary",
  PENDING_QUOTE: "bg-amber-400",
  PENDING: "bg-rose-500",
  PREPARING: "bg-orange-500",
  READY_FOR_PICKUP: "bg-emerald-500",
  DELIVERED: "bg-emerald-700",
};

function queueRank(status: string): number {
  if (status === "PENDING" || status === "PENDING_QUOTE" || status === "QUOTE_ACCEPTED") {
    return 0;
  }
  if (status === "PREPARING") {
    return 1;
  }
  if (status === "READY_FOR_PICKUP") {
    return 2;
  }
  return 9;
}

function matchesQueueFilter(orderStatus: string, filter: VendorOrderFilter): boolean {
  if (filter === "ALL") {
    return queueRank(orderStatus) < 9;
  }
  if (filter === "PENDING") {
    return orderStatus === "PENDING" || orderStatus === "QUOTE_ACCEPTED";
  }
  return orderStatus === filter;
}

const FILTER_DISPLAY: VendorOrderFilter[] = [
  "ALL",
  "PENDING",
  "PREPARING",
  "READY_FOR_PICKUP",
  "DELIVERED",
  "PENDING_QUOTE",
];

export function VendorOrdersBoard({
  store,
  orders,
  queue = [],
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
  queue?: VendorOrderRecord[];
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileDetail, setMobileDetail] = useState(false);
  const [search, setSearch] = useState("");
  const closePrint = useCallback(() => setPrinting(null), []);

  useEffect(() => {
    hydrate(queue, counts);
  }, [counts, hydrate, queue]);

  const visible = liveOrders.length > 0 ? liveOrders : queue;
  const visiblePrepAlerts = useMemo(
    () => prepAlerts.filter((order) => isVendorPrepAlert(order.scheduledDate)),
    [prepAlerts],
  );
  const channelQuotes = status === "PENDING_QUOTE" ? [] : quotes;
  const historyMode = status === "DELIVERED";
  const openQueue = useMemo(() => {
    const seen = new Set(visible.map((order) => order.id));
    const extra = channelQuotes.filter((order) => !seen.has(order.id));
    return [...visible, ...extra].filter((order) => queueRank(order.status) < 9);
  }, [channelQuotes, visible]);
  const filtered = useMemo(() => {
    const source = historyMode ? orders : openQueue;
    const needle = search.trim().toLowerCase();
    const digits = needle.replace(/\D/g, "");
    return source
      .filter((order) => historyMode || matchesQueueFilter(order.status, status))
      .filter((order) => {
        if (!needle) {
          return true;
        }
        const haystack = `${order.orderNumber} ${order.customerName} ${order.customerPhone} ${order.addressText}`.toLowerCase();
        return haystack.includes(needle) || (digits.length >= 3 && order.customerPhone.replace(/\D/g, "").includes(digits));
      })
      .sort((left, right) => {
        if (historyMode) {
          return right.createdAt.localeCompare(left.createdAt);
        }
        const byRank = queueRank(left.status) - queueRank(right.status);
        if (byRank !== 0) {
          return byRank;
        }
        return left.createdAt.localeCompare(right.createdAt);
      });
  }, [historyMode, openQueue, orders, search, status]);
  const lanes = useMemo((): VendorQueueLane[] | null => {
    if (historyMode) {
      return null;
    }
    const groups: VendorQueueLane[] = [
      { id: "accept", title: t("vendor.queueAccept"), orders: filtered.filter((order) => queueRank(order.status) === 0) },
      { id: "prepare", title: t("vendor.queuePrepare"), orders: filtered.filter((order) => queueRank(order.status) === 1) },
      { id: "ready", title: t("vendor.queueReady"), orders: filtered.filter((order) => queueRank(order.status) === 2) },
    ];
    return groups.filter((lane) => lane.orders.length > 0);
  }, [filtered, historyMode, t]);
  const selected = filtered.find((order) => order.id === selectedId) ?? filtered[0] ?? null;

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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <PageHeader title={t("vendor.orders")} description={t("vendor.ordersDesc")} />
        <label className="relative hidden w-full max-w-md lg:block">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("vendor.deskSearch")}
            className="h-11 w-full rounded-2xl border border-border bg-card ps-10 pe-3 text-sm outline-none focus-visible:border-primary"
          />
        </label>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTER_DISPLAY.map((value) => {
          const active = status === value;
          const count = counts[value];
          return (
            <Link
              key={value}
              href={vendorOrdersHref(pathname, { status: value, orderSource, page: 1 })}
              scroll={false}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold",
                active ? "bg-primary text-primary-foreground" : "bg-card text-foreground",
              )}
            >
              <span className={cn("size-2 rounded-full", active ? "bg-primary-foreground" : FILTER_DOT[value])} />
              {t(`vendor.filter.${value}`)}
              <span className={cn(value === "PENDING" && count > 0 && !active && "text-rose-600")}>{count}</span>
            </Link>
          );
        })}
      </div>
      <div className="flex gap-2 overflow-x-auto">
        {VENDOR_ORDER_SOURCES.map((value) => (
          <Link
            key={value}
            href={vendorOrdersHref(pathname, { status, orderSource: value, page: 1 })}
            scroll={false}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-medium",
              orderSource === value ? "bg-foreground text-background" : "bg-muted text-muted-foreground",
            )}
          >
            {t(`vendor.channel.${value}`)}
            <span>{channelCounts[value]}</span>
          </Link>
        ))}
      </div>

      {visiblePrepAlerts.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto">
          {visiblePrepAlerts.map((order) => (
            <button
              key={`alert-${order.id}`}
              type="button"
              onClick={() => {
                setSelectedId(order.id);
                setMobileDetail(true);
              }}
              className="flex min-w-64 items-start gap-2 rounded-2xl border border-warning/40 bg-warning/10 px-3 py-2 text-start"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
              <span>
                <span className="block text-sm font-semibold">{t("vendor.prepAlertTitle", { orderNumber: order.orderNumber })}</span>
                <span className="block text-xs text-muted-foreground">
                  {t("vendor.prepAlertBody", {
                    when: order.scheduledDate ? formatOrderWhen(order.scheduledDate, locale) : "—",
                    left: formatCountdown(
                      (order.scheduledDate ? new Date(order.scheduledDate).getTime() : Date.now()) - Date.now(),
                      locale,
                    ),
                  })}
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : null}

      <VendorOrderWorkspace
        orders={filtered}
        lanes={lanes}
        selected={selected}
        total={total}
        search={search}
        mobileDetail={mobileDetail}
        pending={pending}
        posBusy={posBusy !== null}
        quotePrice={selected ? quoteDrafts[selected.id] ?? "" : ""}
        onSearch={setSearch}
        onRefresh={() => router.refresh()}
        onSelect={(id) => {
          setSelectedId(id);
          setMobileDetail(true);
        }}
        onBack={() => setMobileDetail(false)}
        onQuotePrice={(value) => {
          if (!selected) {
            return;
          }
          setQuoteDrafts((current) => ({ ...current, [selected.id]: value }));
        }}
        onQuote={() => {
          if (selected) {
            quote(selected.id);
          }
        }}
        onToggleItem={(itemId) => {
          if (selected) {
            toggleItem(selected, itemId);
          }
        }}
        onServeAll={() => {
          if (selected) {
            serveAll(selected);
          }
        }}
        onAddItem={() => {
          if (selected) {
            setAddingTo(selected);
          }
        }}
        onAdvance={() => {
          if (selected) {
            advance(selected.id);
          }
        }}
        onCancel={() => {
          if (selected) {
            setCanceling(selected);
          }
        }}
        onPrint={() => {
          if (selected) {
            setPrinting(selected);
          }
        }}
        pagination={
          <VendorOrdersPagination
            pathname={pathname}
            page={page}
            pageSize={pageSize}
            total={total}
            status={status}
            orderSource={orderSource}
          />
        }
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
