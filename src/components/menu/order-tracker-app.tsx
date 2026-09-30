"use client";

import { AnimatePresence, m } from "framer-motion";
import {
  CalendarClock,
  Check,
  ChefHat,
  ClipboardList,
  Link2,
  LoaderCircle,
  MapPin,
  MessageCircle,
  PackageCheck,
  Phone,
  ReceiptText,
  ShoppingBag,
  Sparkles,
  Store,
  Truck,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { BrandMark } from "@/components/brand/brand-mark";
import { useLocale } from "@/components/providers/locale-provider";
import { CustomerReceiptPreview } from "@/components/stores/vendor-thermal-receipt";
import { Button } from "@/components/ui/button";
import { StatusBadge, type BadgeTone } from "@/components/ui/status-badge";
import { TRACKING_STEPS, trackingStepIndex } from "@/lib/stores/order-status";
import { formatCountdown } from "@/lib/stores/custom-order";
import type { VendorOrderRecord } from "@/lib/stores/order-types";
import { formatMoney } from "@/lib/stores/pricing";
import { customerOrderTrackingPath } from "@/lib/stores/public-url";
import {
  readTrackingTokens,
  rememberTrackingTokens,
} from "@/lib/stores/menu-track-store";
import { uniqueTrackingTokens } from "@/lib/stores/tracking-token";
import { supportWhatsAppPhone, whatsappHref } from "@/lib/stores/whatsapp-link";
import { cn } from "@/lib/utils";

const POLL_MS = 4000;
const PAGE_SIZE = 5;
const FILTERS = [
  "ALL",
  "PENDING",
  "PREPARING",
  "READY_FOR_PICKUP",
  "IN_TRANSIT",
  "DELIVERED",
  "CANCELED",
] as const;
const RECEIPT_STATUSES = new Set(["READY_FOR_PICKUP", "ASSIGNED", "IN_TRANSIT", "DELIVERED"]);

type TrackerFilter = (typeof FILTERS)[number];

function matchesFilter(status: string, filter: TrackerFilter): boolean {
  if (filter === "ALL") {
    return true;
  }
  if (filter === "PENDING") {
    return status === "PENDING" || status === "PENDING_QUOTE" || status === "QUOTE_ACCEPTED";
  }
  if (filter === "IN_TRANSIT") {
    return status === "IN_TRANSIT" || status === "ASSIGNED";
  }
  return status === filter;
}

function telHref(phone: string | null | undefined): string | null {
  const raw = phone?.trim() ?? "";
  if (!raw || raw.toUpperCase() === "COUNTER" || !/\d/.test(raw)) {
    return null;
  }
  const dial = raw.replace(/[^\d+]/g, "");
  return dial ? `tel:${dial}` : null;
}

function filterLabel(
  filter: TrackerFilter,
  t: (path: string, vars?: Record<string, string | number>) => string,
): string {
  if (filter === "ALL") {
    return t("menu.filterAll");
  }
  if (filter === "IN_TRANSIT") {
    return t("menu.filterOnTheWay");
  }
  return t(`status.order.${filter}`);
}

const statusTone: Record<string, BadgeTone> = {
  PENDING: "info",
  PENDING_QUOTE: "warning",
  QUOTE_ACCEPTED: "info",
  PREPARING: "warning",
  READY_FOR_PICKUP: "success",
  ASSIGNED: "warning",
  IN_TRANSIT: "success",
  DELIVERED: "muted",
  CANCELED: "destructive",
};

function formatWhen(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SY" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function trackingUrl(token: string): string {
  if (typeof window === "undefined") {
    return customerOrderTrackingPath(token);
  }
  return `${window.location.origin}${customerOrderTrackingPath(token)}`;
}

export function OrderTrackerApp({
  initialToken,
}: {
  initialToken: string;
}): ReactNode {
  const { t, locale } = useLocale();
  const [tokens, setTokens] = useState<string[]>(() => uniqueTrackingTokens([initialToken]));
  const [hydrated, setHydrated] = useState(false);
  const [orders, setOrders] = useState<VendorOrderRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [statusFilter, setStatusFilter] = useState<TrackerFilter>("ALL");
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const next = rememberTrackingTokens(uniqueTrackingTokens([initialToken, ...readTrackingTokens()]));
    setTokens(next);
    setHydrated(true);
  }, [initialToken]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    let cancelled = false;

    const load = async (silent: boolean): Promise<void> => {
      if (tokens.length === 0) {
        if (!cancelled) {
          setOrders([]);
          setLoading(false);
          setError(null);
        }
        return;
      }

      if (!silent) {
        setLoading(true);
      }

      try {
        const response = await fetch("/api/menu/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tokens }),
          cache: "no-store",
        });
        const body = (await response.json()) as
          | { ok: true; orders: VendorOrderRecord[] }
          | { ok: false; error?: string };
        if (cancelled) {
          return;
        }
        if (!body.ok) {
          setError(body.error ?? t("menu.trackEmpty"));
          return;
        }
        setError(null);
        setOrders(body.orders);
        rememberTrackingTokens(body.orders.flatMap((order) => (order.trackingToken ? [order.trackingToken] : [])));
      } catch {
        if (!cancelled) {
          setError(t("menu.trackEmpty"));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load(false);
    const timer = window.setInterval(() => {
      void load(true);
    }, POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [hydrated, t, tokens]);

  const filteredOrders = useMemo(
    () => orders.filter((order) => matchesFilter(order.status, statusFilter)),
    [orders, statusFilter],
  );
  const visibleOrders = filteredOrders.slice(0, visibleCount);
  const remaining = Math.max(0, filteredOrders.length - visibleCount);
  const filterCounts = useMemo(() => {
    const counts = new Map<TrackerFilter, number>();
    for (const filter of FILTERS) {
      counts.set(filter, orders.filter((order) => matchesFilter(order.status, filter)).length);
    }
    return counts;
  }, [orders]);

  const loadMore = useCallback((): void => {
    setVisibleCount((current) => current + PAGE_SIZE);
  }, []);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || remaining === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadMore();
        }
      },
      { rootMargin: "120px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore, remaining, visibleOrders.length]);

  return (
    <div className="mx-auto min-h-dvh w-full max-w-lg">
      <header className="glass-strong sticky top-0 z-30 border-b px-4 pb-3 pt-[max(0.85rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-3">
          <BrandMark size={48} className="size-12 rounded-2xl" />
          <div className="min-w-0">
            <h1 className="font-heading text-[1.7rem] leading-none font-semibold tracking-tight">
              {t("menu.myOrders")}
            </h1>
            <p className="mt-1.5 text-xs text-muted-foreground">{t("menu.trackSubtitle")}</p>
          </div>
        </div>
        <div className="mt-4 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {FILTERS.map((filter) => {
            const active = statusFilter === filter;
            const count = filterCounts.get(filter) ?? 0;
            return (
              <button
                key={filter}
                type="button"
                onClick={() => {
                  setStatusFilter(filter);
                  setVisibleCount(PAGE_SIZE);
                }}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background/70 text-foreground",
                )}
              >
                {filterLabel(filter, t)}
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] tabular-nums",
                    active ? "bg-primary-foreground/15" : "bg-muted text-muted-foreground",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </header>

      <div className="space-y-4 px-4 py-4">
        {tokens.length > 0 ? (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/70" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
            {t("menu.liveUpdating")}
          </p>
        ) : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {loading && orders.length === 0 ? <TrackerSkeleton /> : null}

        {!loading && orders.length === 0 ? (
          <p className="glass rounded-3xl px-4 py-10 text-center text-sm text-muted-foreground">
            {t("menu.trackEmpty")}
          </p>
        ) : null}
        {!loading && orders.length > 0 && filteredOrders.length === 0 ? (
          <p className="glass rounded-3xl px-4 py-10 text-center text-sm text-muted-foreground">
            {t("menu.filterEmpty")}
          </p>
        ) : null}

        <AnimatePresence>
          {visibleOrders.map((order) => (
            <m.div
              key={order.id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <TrackingCard
                order={order}
                locale={locale}
                t={t}
                onUpdated={(next) => {
                  setOrders((current) => current.map((row) => (row.id === next.id ? next : row)));
                }}
              />
            </m.div>
          ))}
        </AnimatePresence>

        {remaining > 0 ? (
          <div ref={sentinelRef} className="pt-1">
            <Button className="w-full rounded-2xl" variant="outline" onPress={loadMore}>
              {t("menu.loadMore")} · {t("menu.remainingOrders", { count: remaining })}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TrackingCard({
  order,
  locale,
  t,
  onUpdated,
}: {
  order: VendorOrderRecord;
  locale: string;
  t: (path: string, vars?: Record<string, string | number>) => string;
  onUpdated: (order: VendorOrderRecord) => void;
}): ReactNode {
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [askCancel, setAskCancel] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const canceled = order.status === "CANCELED";
  const activeIndex = trackingStepIndex(order.status);
  const token = order.trackingToken;
  const shareUrl = token ? trackingUrl(token) : null;
  const shareText = shareUrl
    ? `${t("menu.trackTitle")} ${order.orderNumber}\n${shareUrl}`
    : "";
  const customerWhatsApp = shareText ? whatsappHref(order.customerPhone, shareText) : null;
  const driverWhatsApp = order.driverPhone ? whatsappHref(order.driverPhone) : null;
  const supportPhone = supportWhatsAppPhone(order.storePhone);
  const supportWhatsApp = supportPhone ? whatsappHref(supportPhone) : null;
  const storeTel = telHref(order.storePhone);
  const driverTel = telHref(order.driverPhone);
  const canCancel = order.status === "PENDING" && Boolean(token);
  const canViewReceipt = RECEIPT_STATUSES.has(order.status);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const cancelOrder = async (): Promise<void> => {
    if (!token) {
      return;
    }
    setCanceling(true);
    setCancelError(null);
    try {
      const response = await fetch("/api/menu/orders/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const body = (await response.json()) as
        | { ok: true; order: VendorOrderRecord }
        | { ok: false; error?: string };
      if (!body.ok || !body.order) {
        setCancelError(t("menu.cancelFailed"));
        return;
      }
      onUpdated(body.order);
      setAskCancel(false);
    } catch {
      setCancelError(t("menu.cancelFailed"));
    } finally {
      setCanceling(false);
    }
  };

  const copyLink = async (): Promise<void> => {
    if (!shareUrl) {
      return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <article className="glass space-y-5 rounded-3xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            {formatWhen(order.createdAt, locale)}
          </p>
          <h2 className="font-heading text-xl font-semibold">{order.orderNumber}</h2>
          {order.storeName ? (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Store className="size-3.5" />
              {order.storeName}
            </p>
          ) : null}
        </div>
        <StatusBadge
          label={t(`status.order.${order.status}`)}
          tone={statusTone[order.status] ?? "muted"}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {storeTel ? (
          <a
            href={storeTel}
            className={cn(
              "inline-flex h-11 items-center justify-center gap-1.5 rounded-2xl border border-border bg-background/70 text-sm font-semibold",
              driverTel ? "" : "col-span-2",
            )}
          >
            <Phone className="size-4" />
            {t("menu.callStore")}
          </a>
        ) : null}
        {driverTel ? (
          <a
            href={driverTel}
            className={cn(
              "inline-flex h-11 items-center justify-center gap-1.5 rounded-2xl bg-primary text-sm font-semibold text-primary-foreground",
              storeTel ? "" : "col-span-2",
            )}
          >
            <Phone className="size-4" />
            {t("menu.callDriver")}
          </a>
        ) : null}
        {canViewReceipt ? (
          <button
            type="button"
            onClick={() => setReceiptOpen(true)}
            className="col-span-2 inline-flex h-11 items-center justify-center gap-1.5 rounded-2xl border border-primary/30 bg-primary/10 text-sm font-semibold text-primary"
          >
            <ReceiptText className="size-4" />
            {t("menu.viewReceipt")}
          </button>
        ) : null}
        {canCancel ? (
          <button
            type="button"
            onClick={() => {
              setAskCancel(true);
              setCancelError(null);
            }}
            className="col-span-2 inline-flex h-11 items-center justify-center gap-1.5 rounded-2xl border border-destructive/40 text-sm font-semibold text-destructive"
          >
            {t("menu.cancelOrder")}
          </button>
        ) : null}
      </div>

      {askCancel ? (
        <div className="space-y-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-3">
          <p className="text-sm font-medium">{t("menu.cancelConfirm")}</p>
          {cancelError ? <p className="text-sm text-destructive">{cancelError}</p> : null}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="rounded-2xl" onPress={() => setAskCancel(false)} isDisabled={canceling}>
              {t("menu.keepOrder")}
            </Button>
            <Button
              variant="destructive"
              className="rounded-2xl"
              onPress={() => void cancelOrder()}
              isDisabled={canceling}
            >
              {canceling ? <LoaderCircle className="size-4 animate-spin" /> : null}
              {t("menu.confirmCancel")}
            </Button>
          </div>
        </div>
      ) : null}

      {order.orderType === "SPECIAL_CUSTOM" ? (
        <div className="space-y-3 rounded-2xl border border-primary/25 bg-primary/5 p-3">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="size-4 text-primary" />
            {t("menu.customTitle")}
          </p>
          {order.customImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={order.customImage} alt="" className="h-40 w-full rounded-xl object-cover" />
          ) : null}
          {order.customNotes ? <p className="text-sm">{order.customNotes}</p> : null}
          {order.scheduledDate ? (
            <p className="flex items-center gap-2 text-sm">
              <CalendarClock className="size-4 text-primary" />
              <span>
                {t("menu.customDeliverAt")}: {formatWhen(order.scheduledDate, locale)}
              </span>
            </p>
          ) : null}
          {order.scheduledDate && order.status !== "CANCELED" && order.status !== "DELIVERED" ? (
            <p className="text-xs font-medium text-muted-foreground">
              {t("menu.customCountdown", {
                time: formatCountdown(new Date(order.scheduledDate).getTime() - now, locale),
              })}
            </p>
          ) : null}
          {order.status === "PENDING_QUOTE" ? (
            <p className="text-sm text-muted-foreground">{t("menu.customWaitingQuote")}</p>
          ) : null}
          {order.status === "QUOTE_ACCEPTED" && order.quotedPrice != null ? (
            <div className="space-y-2">
              <p className="text-sm font-semibold">
                {t("menu.customQuoted")}: {formatMoney(order.quotedPrice)} {t("menu.currency")}
              </p>
              {confirmError ? <p className="text-sm text-destructive">{confirmError}</p> : null}
              <Button
                className="w-full rounded-2xl"
                isDisabled={confirming || !token}
                onPress={() => {
                  if (!token) {
                    return;
                  }
                  setConfirming(true);
                  setConfirmError(null);
                  void fetch("/api/menu/custom-orders/confirm", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ token }),
                  })
                    .then(async (response) => {
                      const body = (await response.json()) as { ok?: boolean; error?: string };
                      if (!body.ok) {
                        setConfirmError(body.error ?? t("menu.placeFailed"));
                      }
                    })
                    .catch(() => setConfirmError(t("menu.placeFailed")))
                    .finally(() => setConfirming(false));
                }}
              >
                {confirming ? <LoaderCircle className="size-4 animate-spin" /> : null}
                {t("menu.customConfirmPay")}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {canceled ? (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 px-3 py-3 text-sm text-destructive">
          <p className="font-medium">{t("menu.canceledTitle")}</p>
          {order.cancelReason ? (
            <p className="mt-1 text-destructive/90">
              {t("menu.canceledReason")}: {order.cancelReason}
            </p>
          ) : null}
        </div>
      ) : (
        <OrderStepper activeIndex={activeIndex} t={t} />
      )}

      <div className="grid gap-3">
        <div className="rounded-2xl border border-border/60 bg-background/40 p-3">
          <p className="mb-2 flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            <MapPin className="size-3.5" />
            {t("menu.deliveryCard")}
          </p>
          <p className="text-sm font-medium">{order.addressText}</p>
          {order.storeNotes ? (
            <p className="mt-2 text-xs text-muted-foreground">
              {t("menu.storeNotes")}: {order.storeNotes}
            </p>
          ) : null}
          <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Phone className="size-3.5" />
            {order.customerName} · {order.customerPhone}
          </p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-background/40 p-3">
          <p className="mb-2 flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            <UserRound className="size-3.5" />
            {t("menu.courierCard")}
          </p>
          <p className="text-sm font-medium">
            {order.driverName || t("menu.courierPending")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {order.status === "IN_TRANSIT"
              ? t("menu.courierOnTheWay")
              : t("menu.courierHint")}
          </p>
          {driverWhatsApp ? (
            <a
              href={driverWhatsApp}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#25D366] px-3 text-xs font-semibold text-white"
            >
              <MessageCircle className="size-3.5" />
              {t("menu.contactDriver")}
            </a>
          ) : null}
        </div>

        <div className="rounded-2xl border border-border/60 bg-background/40 p-3">
          <p className="mb-2 flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            <ShoppingBag className="size-3.5" />
            {t("vendor.orderItems")}
          </p>
          <div className="space-y-2">
            {order.items.map((item) => (
              <div key={`${order.id}-${item.storeName ?? ""}-${item.name}`} className="flex justify-between text-sm">
                <span>
                  {item.storeName ? `${item.storeName} · ` : ""}
                  {item.name} × {item.quantity}
                </span>
                <span className="font-medium">
                  {formatMoney(item.unitPrice * item.quantity)} {t("menu.currency")}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 border-t border-border/50 pt-2 text-sm font-semibold">
            {t("vendor.orderTotal")}: {formatMoney(order.total)} {t("menu.currency")}
          </p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {token ? (
          <Button variant="outline" className="rounded-2xl" onPress={() => void copyLink()}>
            <Link2 className="size-4" />
            {copied ? t("menu.trackingLinkCopied") : t("menu.saveTrackingLink")}
          </Button>
        ) : null}
        {customerWhatsApp ? (
          <a
            href={customerWhatsApp}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-2xl bg-[#25D366] px-2.5 text-sm font-medium text-white"
          >
            <MessageCircle className="size-4" />
            {t("menu.sendTrackingWhatsApp")}
          </a>
        ) : null}
        {supportWhatsApp ? (
          <a
            href={supportWhatsApp}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-2xl border border-border bg-background/70 px-2.5 text-sm font-medium sm:col-span-2"
          >
            <MessageCircle className="size-4" />
            {t("menu.contactSupport")}
          </a>
        ) : null}
      </div>
      {receiptOpen ? <CustomerReceiptPreview order={order} onClose={() => setReceiptOpen(false)} /> : null}
    </article>
  );
}

function OrderStepper({
  activeIndex,
  t,
}: {
  activeIndex: number;
  t: (path: string, vars?: Record<string, string | number>) => string;
}): ReactNode {
  const icons = useMemo(
    () => [ClipboardList, ChefHat, PackageCheck, Truck, Check] as const,
    [],
  );

  return (
    <ol className="flex items-start justify-between gap-1">
      {TRACKING_STEPS.map((step, index) => {
        const Icon = icons[index] ?? Check;
        const reached = index <= activeIndex;
        const current = index === activeIndex;
        return (
          <li key={step} className="flex min-w-0 flex-1 flex-col items-center text-center">
            <div className="flex w-full items-center">
              <span
                className={cn(
                  "h-px flex-1",
                  index === 0 ? "bg-transparent" : reached ? "bg-primary" : "bg-border",
                )}
              />
              <span
                className={cn(
                  "relative flex size-8 items-center justify-center rounded-full border",
                  reached
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground",
                )}
              >
                {current ? (
                  <span className="absolute inset-0 animate-ping rounded-full bg-primary/40" />
                ) : null}
                <Icon className="relative size-3.5" />
              </span>
              <span
                className={cn(
                  "h-px flex-1",
                  index === TRACKING_STEPS.length - 1
                    ? "bg-transparent"
                    : index < activeIndex
                      ? "bg-primary"
                      : "bg-border",
                )}
              />
            </div>
            <p
              className={cn(
                "mt-2 text-[10px] leading-tight font-medium",
                current ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {t(`menu.step.${step}`)}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

function TrackerSkeleton(): ReactNode {
  return (
    <div className="space-y-3 rounded-3xl border border-border/60 p-5">
      <div className="h-5 w-32 animate-pulse rounded bg-muted" />
      <div className="h-8 w-full animate-pulse rounded-full bg-muted" />
      <div className="h-24 w-full animate-pulse rounded-2xl bg-muted" />
    </div>
  );
}
