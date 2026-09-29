"use client";

import { Check, Copy, Phone, RefreshCw, Search, Store } from "lucide-react";
import { useEffect, useMemo, useState, type ReactElement } from "react";
import { useRouter } from "next/navigation";

import { useLocale } from "@/components/providers/locale-provider";
import { FadeIn } from "@/components/ui/fade-in";
import { GlassCard } from "@/components/ui/glass-card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge, type BadgeTone } from "@/components/ui/status-badge";
import type { StaffAttention, StaffOrderRecord } from "@/lib/dispatch/staff-orders";
import type { Locale } from "@/lib/localized";
import { formatPrice } from "@/lib/stores/pricing";

const tone: Record<string, BadgeTone> = {
  PENDING: "info",
  PENDING_QUOTE: "warning",
  QUOTE_ACCEPTED: "info",
  PREPARING: "warning",
  READY_FOR_PICKUP: "info",
  ASSIGNED: "info",
  IN_TRANSIT: "success",
  DELIVERED: "muted",
  CANCELED: "destructive",
};

const filters = ["all", "attention", "open", "DELIVERED", "CANCELED"] as const;
type DeskFilter = (typeof filters)[number];

const actions: Record<Locale, Record<string, string>> = {
  ar: {
    ORDER_CREATED: "أُنشئ الطلب",
    DRIVER_ASSIGNED: "تم إسناد مندوب",
    DRIVER_OFFER_ACCEPTED: "المندوب قبل الطلب",
    ORDER_CANCELED: "أُلغي الطلب",
    CASH_SETTLED: "تمت تسوية النقد",
    CUSTOM_ORDER_CREATED: "طلب خاص",
    CUSTOM_QUOTE_SENT: "أُرسل السعر",
    CUSTOM_QUOTE_CONFIRMED: "العميل أكد السعر",
  },
  en: {
    ORDER_CREATED: "Order created",
    DRIVER_ASSIGNED: "Driver assigned",
    DRIVER_OFFER_ACCEPTED: "Driver accepted",
    ORDER_CANCELED: "Order canceled",
    CASH_SETTLED: "Cash settled",
    CUSTOM_ORDER_CREATED: "Custom order",
    CUSTOM_QUOTE_SENT: "Quote sent",
    CUSTOM_QUOTE_CONFIRMED: "Quote confirmed",
  },
};

const copy: Record<
  Locale,
  {
    title: string;
    description: string;
    recent: string;
    searching: string;
    search: string;
    refresh: string;
    empty: string;
    failed: string;
    attention: string;
    all: string;
    open: string;
    delivered: string;
    canceled: string;
    customer: string;
    store: string;
    driver: string;
    unassigned: string;
    address: string;
    items: string;
    fee: string;
    total: string;
    notes: string;
    cancel: string;
    timeline: string;
    noItems: string;
    copy: string;
    copied: string;
    stale: string;
    source: string;
    table: string;
    quote: string;
    cod: string;
    delivery: string;
    dineIn: string;
    updated: string;
  }
> = {
  ar: {
    title: "متابعة الطلبات",
    description: "مكتب الشكاوي: العميل، المتجر، المندوب، المبلغ، وسبب الإلغاء.",
    recent: "بدون بحث تظهر آخر 250 طلباً. ابحث برقم الطلب أو الجوال للوصول لطلب أقدم.",
    searching: "البحث يشمل كل الطلبات، بما فيها الأقدم.",
    search: "رقم الطلب، جوال العميل، المتجر، أو المندوب",
    refresh: "تحديث",
    empty: "لا توجد طلبات مطابقة.",
    failed: "تعذر تحميل الطلبات الآن. حدّث الصفحة بعد لحظات.",
    attention: "تحتاج متابعة",
    all: "الكل",
    open: "مفتوحة",
    delivered: "تم التسليم",
    canceled: "ملغاة",
    customer: "اتصال بالعميل",
    store: "اتصال بالمتجر",
    driver: "اتصال بالمندوب",
    unassigned: "بدون مندوب",
    address: "العنوان",
    items: "الأصناف",
    fee: "التوصيل",
    total: "الإجمالي",
    notes: "ملاحظات",
    cancel: "سبب الإلغاء",
    timeline: "آخر الحركات",
    noItems: "لا توجد أصناف مسجلة.",
    copy: "نسخ الرقم",
    copied: "تم النسخ",
    stale: "متأخر",
    source: "المصدر",
    table: "طاولة",
    quote: "السعر المعروض",
    cod: "تحصيل",
    delivery: "توصيل",
    dineIn: "داخل المحل",
    updated: "آخر تحديث",
  },
  en: {
    title: "Order follow-up",
    description: "Complaint desk: customer, store, driver, amount, and cancel reason.",
    recent: "Without a search this shows the latest 250 orders. Search a number or phone for older ones.",
    searching: "Search covers every order, including older ones.",
    search: "Order number, customer phone, store, or driver",
    refresh: "Refresh",
    empty: "No matching orders.",
    failed: "Orders could not be loaded. Refresh in a moment.",
    attention: "Needs follow-up",
    all: "All",
    open: "Open",
    delivered: "Delivered",
    canceled: "Canceled",
    customer: "Call customer",
    store: "Call store",
    driver: "Call driver",
    unassigned: "Unassigned",
    address: "Address",
    items: "Items",
    fee: "Delivery",
    total: "Total",
    notes: "Notes",
    cancel: "Cancel reason",
    timeline: "Recent activity",
    noItems: "No items recorded.",
    copy: "Copy number",
    copied: "Copied",
    stale: "Late",
    source: "Source",
    table: "Table",
    quote: "Quoted price",
    cod: "COD",
    delivery: "Delivery",
    dineIn: "Dine-in",
    updated: "Updated",
  },
};

function passesFilter(order: StaffOrderRecord, filter: DeskFilter): boolean {
  if (filter === "all") {
    return true;
  }
  if (filter === "attention") {
    return order.attention === "cancel" || order.attention === "stale";
  }
  if (filter === "open") {
    return order.attention === "open" || order.attention === "stale";
  }
  return order.status === filter;
}

export function StaffOrdersDesk({
  orders,
  query,
  failed,
}: {
  orders: StaffOrderRecord[];
  query: string;
  failed: boolean;
}): ReactElement {
  const { locale, t } = useLocale();
  const text = copy[locale];
  const router = useRouter();
  const [draft, setDraft] = useState(query);
  const [filter, setFilter] = useState<DeskFilter>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setDraft(query);
  }, [query]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const next = draft.trim();
      if (next === query.trim()) {
        return;
      }
      const params = new URLSearchParams();
      if (next) {
        params.set("q", next);
      }
      router.replace(params.size > 0 ? `/orders?${params.toString()}` : "/orders");
    }, 350);
    return () => window.clearTimeout(handle);
  }, [draft, query, router]);

  const visible = useMemo(() => {
    return orders
      .filter((order) => passesFilter(order, filter))
      .sort((left, right) => {
        const rank = (attention: StaffAttention): number =>
          attention === "stale" ? 0 : attention === "cancel" ? 1 : attention === "open" ? 2 : 3;
        const byRank = rank(left.attention) - rank(right.attention);
        if (byRank !== 0) {
          return byRank;
        }
        return right.createdAt.localeCompare(left.createdAt);
      });
  }, [filter, orders]);

  const counts = {
    all: orders.length,
    attention: orders.filter((order) => order.attention === "cancel" || order.attention === "stale").length,
    open: orders.filter((order) => order.attention === "open" || order.attention === "stale").length,
    delivered: orders.filter((order) => order.status === "DELIVERED").length,
    canceled: orders.filter((order) => order.status === "CANCELED").length,
  };

  const copyNumber = async (order: StaffOrderRecord): Promise<void> => {
    try {
      await navigator.clipboard.writeText(order.orderNumber);
      setCopiedId(order.id);
      window.setTimeout(() => setCopiedId((current) => (current === order.id ? null : current)), 1600);
    } catch {
      setCopiedId(null);
    }
  };

  const formatWhen = (iso: string): string =>
    new Date(iso).toLocaleString(locale === "ar" ? "ar" : "en-GB", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const filterLabel = (id: DeskFilter): string => {
    if (id === "all") return text.all;
    if (id === "attention") return text.attention;
    if (id === "open") return text.open;
    if (id === "DELIVERED") return text.delivered;
    return text.canceled;
  };

  const fulfillmentLabel = (value: string): string => {
    if (value === "DINE_IN") return text.dineIn;
    if (value === "DELIVERY") return text.delivery;
    return value;
  };

  return (
    <div className="space-y-6">
      <FadeIn>
        <PageHeader
          title={text.title}
          description={text.description}
          action={
            <button
              type="button"
              onClick={() => router.refresh()}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-medium"
            >
              <RefreshCw className="size-4" aria-hidden />
              {text.refresh}
            </button>
          }
        />
      </FadeIn>

      <div className="flex flex-col gap-3">
        <label className="relative block">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={text.search}
            className="h-11 w-full rounded-2xl border border-border bg-card ps-10 pe-3 text-sm outline-none focus-visible:border-primary"
          />
        </label>
        <p className="text-xs text-muted-foreground">{query.trim() ? text.searching : text.recent}</p>
        <div className="flex flex-wrap gap-2">
          {filters.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={
                filter === id
                  ? "rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                  : "rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground"
              }
            >
              {filterLabel(id)} · {counts[id === "DELIVERED" ? "delivered" : id === "CANCELED" ? "canceled" : id]}
            </button>
          ))}
        </div>
      </div>

      {failed ? (
        <GlassCard hover={false}>
          <p className="text-sm text-destructive">{text.failed}</p>
        </GlassCard>
      ) : null}

      {!failed && visible.length === 0 ? (
        <GlassCard hover={false}>
          <p className="text-sm text-muted-foreground">{text.empty}</p>
        </GlassCard>
      ) : null}

      {!failed && visible.length > 0 ? (
        <div className="space-y-3">
          {visible.map((order) => {
            const expanded = openId === order.id;
            const total = order.itemsTotal + order.deliveryFee;
            return (
              <GlassCard key={order.id} hover={false} className="p-0">
                <button
                  type="button"
                  onClick={() => setOpenId(expanded ? null : order.id)}
                  className="flex w-full flex-col gap-3 px-4 py-4 text-start sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-semibold">{order.orderNumber}</span>
                      <StatusBadge label={t(`status.order.${order.status}`)} tone={tone[order.status] ?? "muted"} />
                      {order.attention === "stale" ? <StatusBadge label={text.stale} tone="warning" /> : null}
                    </div>
                    <p className="mt-1 text-sm">
                      {order.customerName}
                      <span className="text-muted-foreground"> · {order.customerPhone}</span>
                    </p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {order.storeName ?? "—"} · {order.driverName ?? text.unassigned} · {formatWhen(order.createdAt)}
                    </p>
                  </div>
                  <div className="text-sm font-semibold">{formatPrice(total)}</div>
                </button>
                {expanded ? (
                  <div className="space-y-4 border-t border-border/70 px-4 py-4 text-sm">
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={`tel:${order.customerPhone}`}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-primary/10 px-3 py-2 text-xs font-semibold text-primary"
                      >
                        <Phone className="size-3.5" aria-hidden />
                        {text.customer}
                      </a>
                      {order.stores.map((store) =>
                        store.phone ? (
                          <a
                            key={store.name}
                            href={`tel:${store.phone}`}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-muted px-3 py-2 text-xs font-semibold"
                          >
                            <Store className="size-3.5" aria-hidden />
                            {store.name}
                          </a>
                        ) : null,
                      )}
                      {order.driverPhone ? (
                        <a
                          href={`tel:${order.driverPhone}`}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-muted px-3 py-2 text-xs font-semibold"
                        >
                          <Phone className="size-3.5" aria-hidden />
                          {order.driverName ?? text.driver}
                        </a>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => void copyNumber(order)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-muted px-3 py-2 text-xs font-semibold"
                      >
                        {copiedId === order.id ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                        {copiedId === order.id ? text.copied : text.copy}
                      </button>
                    </div>
                    <dl className="grid gap-3 text-xs sm:grid-cols-2">
                      <div>
                        <dt className="text-muted-foreground">{text.address}</dt>
                        <dd>{order.addressText}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">{text.driver}</dt>
                        <dd>
                          {order.driverName ?? text.unassigned}
                          {order.driverPhone ? ` · ${order.driverPhone}` : ""}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">{text.source}</dt>
                        <dd>
                          {order.source} · {fulfillmentLabel(order.fulfillment)}
                          {order.tableLabel ? ` · ${text.table} ${order.tableLabel}` : ""}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">{text.updated}</dt>
                        <dd>{formatWhen(order.updatedAt)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">{text.total}</dt>
                        <dd>
                          {formatPrice(total)} · {text.fee} {formatPrice(order.deliveryFee)}
                          {order.codAmount != null ? ` · ${text.cod} ${formatPrice(order.codAmount)}` : ""}
                          {order.quotedPrice != null ? ` · ${text.quote} ${formatPrice(order.quotedPrice)}` : ""}
                        </dd>
                      </div>
                    </dl>
                    <div>
                      <p className="mb-2 text-xs font-semibold text-muted-foreground">{text.items}</p>
                      {order.items.length === 0 ? (
                        <p className="text-xs text-muted-foreground">{text.noItems}</p>
                      ) : (
                        <ul className="space-y-1">
                          {order.items.map((item, index) => (
                            <li key={`${item.name}-${index}`} className="flex justify-between gap-3 text-xs">
                              <span>
                                {item.quantity}× {item.name}
                                {item.storeName ? ` · ${item.storeName}` : ""}
                              </span>
                              <span className="font-mono">{formatPrice(item.unitPrice * item.quantity)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    {order.cancelReason ? (
                      <p className="rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">
                        {text.cancel}: {order.cancelReason}
                      </p>
                    ) : null}
                    {order.storeNotes || order.customNotes ? (
                      <p className="rounded-xl bg-muted px-3 py-2 text-xs">
                        {text.notes}: {[order.storeNotes, order.customNotes].filter(Boolean).join(" · ")}
                      </p>
                    ) : null}
                    {order.events.length > 0 ? (
                      <div>
                        <p className="mb-2 text-xs font-semibold text-muted-foreground">{text.timeline}</p>
                        <ul className="space-y-1 text-xs text-muted-foreground">
                          {order.events.map((event) => (
                            <li key={`${event.action}-${event.createdAt}`}>
                              {actions[locale][event.action] ?? event.action} · {formatWhen(event.createdAt)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </GlassCard>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
