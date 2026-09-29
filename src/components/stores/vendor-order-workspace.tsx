"use client";

import { Armchair, Bike, CalendarClock, Check, ChevronLeft, MapPin, Phone, Plus, Printer, RefreshCw, Search, UtensilsCrossed } from "lucide-react";
import type { ReactNode } from "react";

import { guestDisplayName, ORDER_STATUS_TONE } from "@/components/stores/vendor-order-ticket";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { vendorCanCancel, vendorNextActionKey } from "@/lib/stores/order-status";
import type { VendorOrderRecord } from "@/lib/stores/order-types";
import { formatMoney, PRICE_CURRENCY } from "@/lib/stores/pricing";
import { cn } from "@/lib/utils";

function formatClock(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SY" : "en-GB", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDay(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SY" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function statusChip(status: string): string {
  if (status === "CANCELED") {
    return "bg-rose-500/12 text-rose-700 dark:text-rose-300";
  }
  if (status === "PREPARING" || status === "PENDING_QUOTE" || status === "QUOTE_ACCEPTED") {
    return "bg-orange-500/12 text-orange-700 dark:text-orange-300";
  }
  if (status === "READY_FOR_PICKUP" || status === "ASSIGNED" || status === "IN_TRANSIT") {
    return "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300";
  }
  if (status === "DELIVERED") {
    return "bg-muted text-muted-foreground";
  }
  return "bg-sky-500/12 text-sky-800 dark:text-sky-200";
}

export interface VendorQueueLane {
  id: string;
  title: string;
  orders: VendorOrderRecord[];
}

export function VendorOrderWorkspace({
  orders,
  lanes,
  selected,
  total,
  search,
  mobileDetail,
  pending,
  posBusy,
  quotePrice,
  onSearch,
  onRefresh,
  onSelect,
  onBack,
  onQuotePrice,
  onQuote,
  onToggleItem,
  onServeAll,
  onAddItem,
  onAdvance,
  onCancel,
  onPrint,
  pagination,
}: {
  orders: VendorOrderRecord[];
  lanes: VendorQueueLane[] | null;
  selected: VendorOrderRecord | null;
  total: number;
  search: string;
  mobileDetail: boolean;
  pending: boolean;
  posBusy: boolean;
  quotePrice: string;
  onSearch: (value: string) => void;
  onRefresh: () => void;
  onSelect: (id: string) => void;
  onBack: () => void;
  onQuotePrice: (value: string) => void;
  onQuote: () => void;
  onToggleItem: (itemId: string) => void;
  onServeAll: () => void;
  onAddItem: () => void;
  onAdvance: () => void;
  onCancel: () => void;
  onPrint: () => void;
  pagination: ReactNode;
}): ReactNode {
  const { t, locale } = useLocale();

  return (
    <div className="grid items-start gap-4 lg:h-[calc(100dvh-13.5rem)] lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section className={cn("min-h-0 lg:overflow-y-auto lg:pe-1", !mobileDetail && "max-lg:hidden")}>
        {selected ? (
          <OrderDetail
            order={selected}
            locale={locale}
            pending={pending}
            posBusy={posBusy}
            quotePrice={quotePrice}
            onBack={onBack}
            onQuotePrice={onQuotePrice}
            onQuote={onQuote}
            onToggleItem={onToggleItem}
            onServeAll={onServeAll}
            onAddItem={onAddItem}
            onAdvance={onAdvance}
            onCancel={onCancel}
            onPrint={onPrint}
          />
        ) : (
          <div className="flex min-h-64 items-center justify-center rounded-3xl border border-dashed border-border bg-card/70 px-6 text-sm text-muted-foreground">
            {t("vendor.emptyOrders")}
          </div>
        )}
      </section>

      <aside className={cn("flex min-h-0 flex-col gap-3 lg:overflow-hidden", mobileDetail && "max-lg:hidden")}>
        <div className="flex items-center justify-between gap-3 px-1">
          <h2 className="text-sm font-semibold">
            {lanes ? t("vendor.queueTitle") : t("vendor.queueHistory")}
            <span className="ms-1 text-muted-foreground">({lanes ? orders.length : total})</span>
          </h2>
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex size-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground"
            aria-label={t("vendor.refreshOrders")}
          >
            <RefreshCw className="size-4" />
          </button>
        </div>
        <label className="relative block lg:hidden">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder={t("vendor.deskSearch")}
            className="h-11 w-full rounded-2xl border border-border bg-card ps-10 pe-3 text-sm outline-none focus-visible:border-primary"
          />
        </label>
        <div className="min-h-0 space-y-3 lg:overflow-y-auto lg:pe-1">
          {orders.length === 0 ? (
            <p className="rounded-2xl bg-card px-4 py-8 text-center text-sm text-muted-foreground">
              {lanes ? t("vendor.queueEmpty") : t("vendor.emptyOrders")}
            </p>
          ) : lanes ? (
            lanes.map((lane) => (
              <section key={lane.id} className="space-y-2">
                <h3 className="px-1 text-[11px] font-semibold tracking-wide text-muted-foreground">
                  {lane.title}
                  <span className="ms-1">({lane.orders.length})</span>
                </h3>
                {lane.orders.map((order) => (
                  <QueueCard
                    key={order.id}
                    order={order}
                    active={selected?.id === order.id}
                    locale={locale}
                    label={t(`status.order.${order.status}`)}
                    onSelect={onSelect}
                  />
                ))}
              </section>
            ))
          ) : (
            orders.map((order) => (
              <QueueCard
                key={order.id}
                order={order}
                active={selected?.id === order.id}
                locale={locale}
                label={t(`status.order.${order.status}`)}
                onSelect={onSelect}
              />
            ))
          )}
        </div>
        {lanes ? null : pagination}
      </aside>
    </div>
  );
}

function QueueCard({
  order,
  active,
  locale,
  label,
  onSelect,
}: {
  order: VendorOrderRecord;
  active: boolean;
  locale: string;
  label: string;
  onSelect: (id: string) => void;
}): ReactNode {
  return (
    <button
      type="button"
      onClick={() => onSelect(order.id)}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-start transition-colors",
        active
          ? "border-primary bg-primary/10 shadow-[0_10px_30px_-24px_var(--primary)]"
          : "border-transparent bg-card hover:border-border",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-heading text-base font-semibold">{order.orderNumber}</span>
          <span className="shrink-0 text-[11px] text-muted-foreground">{formatClock(order.createdAt, locale)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className={cn("truncate rounded-full px-2 py-0.5 text-[11px] font-semibold", statusChip(order.status))}>
            {label}
          </span>
          <span className="shrink-0 text-xs font-semibold">
            {formatMoney(order.total)} {PRICE_CURRENCY}
          </span>
        </div>
      </div>
    </button>
  );
}

function OrderDetail({
  order,
  locale,
  pending,
  posBusy,
  quotePrice,
  onBack,
  onQuotePrice,
  onQuote,
  onToggleItem,
  onServeAll,
  onAddItem,
  onAdvance,
  onCancel,
  onPrint,
}: {
  order: VendorOrderRecord;
  locale: string;
  pending: boolean;
  posBusy: boolean;
  quotePrice: string;
  onBack: () => void;
  onQuotePrice: (value: string) => void;
  onQuote: () => void;
  onToggleItem: (itemId: string) => void;
  onServeAll: () => void;
  onAddItem: () => void;
  onAdvance: () => void;
  onCancel: () => void;
  onPrint: () => void;
}): ReactNode {
  const { t } = useLocale();
  const dineIn = order.fulfillment === "DINE_IN";
  const guest = guestDisplayName(order, t);
  const actionKey = vendorNextActionKey(order.status);
  const quoteValue = Number.parseFloat(quotePrice);
  const notes = [order.storeNotes, order.customNotes].filter(Boolean).join(" · ");
  const openItems = order.items.some((item) => item.status !== "SERVED");

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground lg:hidden"
      >
        <ChevronLeft className="size-4 rtl:rotate-180" />
        {t("vendor.backToQueue")}
      </button>

      <article className="overflow-hidden rounded-3xl border border-border/70 bg-card shadow-[0_18px_50px_-36px_color-mix(in_oklch,var(--foreground)_35%,transparent)]">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 px-5 py-4">
          <div>
            <p className="font-heading text-3xl font-semibold tracking-tight">{order.orderNumber}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatDay(order.createdAt, locale)} · {formatClock(order.createdAt, locale)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              label={t(`status.order.${order.status}`)}
              tone={ORDER_STATUS_TONE[order.status] ?? "muted"}
              className="normal-case tracking-normal"
            />
            {actionKey ? (
              <Button onPress={onAdvance} isDisabled={pending}>
                {t(actionKey)}
              </Button>
            ) : null}
          </div>
        </header>

        <div className="grid gap-3 px-5 py-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-muted/40 px-4 py-3">
            <p className="text-[11px] font-medium text-muted-foreground">{t("vendor.customer")}</p>
            <p className="mt-1 font-semibold">{guest}</p>
            {order.customerPhone === "COUNTER" ? null : (
              <a href={`tel:${order.customerPhone}`} className="mt-1 inline-flex items-center gap-1.5 text-sm text-primary">
                <Phone className="size-3.5" />
                {order.customerPhone}
              </a>
            )}
          </div>
          <div className="rounded-2xl bg-muted/40 px-4 py-3">
            <p className="text-[11px] font-medium text-muted-foreground">
              {dineIn ? t("vendor.dineInService") : t("vendor.deliveryExternal")}
            </p>
            <p className="mt-1 flex items-start gap-1.5 text-sm">
              {dineIn ? <Armchair className="mt-0.5 size-3.5 shrink-0" /> : <MapPin className="mt-0.5 size-3.5 shrink-0" />}
              <span>{dineIn ? order.tableLabel || order.addressText : order.addressText}</span>
            </p>
            {order.driverName ? (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Bike className="size-3.5" />
                {order.driverName}
                {order.driverPhone ? ` · ${order.driverPhone}` : ""}
              </p>
            ) : null}
          </div>
        </div>

        {order.orderType === "SPECIAL_CUSTOM" ? (
          <div className="space-y-3 px-5 pb-4">
            {order.customImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={order.customImage} alt="" className="h-40 w-full rounded-2xl object-cover" />
            ) : null}
            {order.scheduledDate ? (
              <p className="flex items-center gap-1.5 text-sm">
                <CalendarClock className="size-4 text-primary" />
                {t("vendor.scheduledFor")}: {formatDay(order.scheduledDate, locale)} · {formatClock(order.scheduledDate, locale)}
              </p>
            ) : null}
            {order.status === "PENDING_QUOTE" ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  inputMode="decimal"
                  value={quotePrice}
                  onChange={(event) => onQuotePrice(event.target.value)}
                  placeholder={t("vendor.quotedPrice")}
                  className="h-11 min-w-0 flex-1 rounded-2xl border border-border bg-background px-3 text-sm outline-none focus-visible:border-primary"
                />
                <Button onPress={onQuote} isDisabled={pending || !Number.isFinite(quoteValue) || quoteValue <= 0}>
                  {t("vendor.sendQuote")}
                </Button>
              </div>
            ) : null}
            {order.quotedPrice != null ? (
              <p className="text-sm">
                <span className="text-muted-foreground">{t("vendor.quotedPrice")}: </span>
                {formatMoney(order.quotedPrice)} {PRICE_CURRENCY}
              </p>
            ) : null}
            {order.status === "QUOTE_ACCEPTED" ? (
              <p className="text-xs text-muted-foreground">{t("vendor.waitingCustomer")}</p>
            ) : null}
          </div>
        ) : null}

        <div className="px-5 pb-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold">
              <UtensilsCrossed className="size-4 text-primary" />
              {t("vendor.orderItems")}
            </h3>
            {dineIn && order.status !== "CANCELED" && openItems ? (
              <button
                type="button"
                onClick={onServeAll}
                disabled={posBusy}
                className="text-xs font-medium text-primary disabled:opacity-50"
              >
                {t("vendor.serveAllItems")}
              </button>
            ) : null}
          </div>
          {order.items.length === 0 ? (
            <p className="rounded-2xl bg-muted/40 px-4 py-6 text-sm text-muted-foreground">{t("vendor.noItems")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-[11px] text-muted-foreground">
                    <th className="px-2 py-2 text-start font-medium">{t("vendor.colItem")}</th>
                    <th className="px-2 py-2 text-center font-medium">{t("vendor.colQty")}</th>
                    <th className="px-2 py-2 text-center font-medium">{t("vendor.colPrice")}</th>
                    <th className="px-2 py-2 text-end font-medium">{t("vendor.lineTotalCol")}</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, index) => {
                    const served = item.status === "SERVED";
                    return (
                      <tr key={item.id || `${order.id}-${index}`} className="border-b border-border/40 last:border-0">
                        <td className="px-2 py-3">
                          <span className="flex min-w-0 items-center gap-3">
                            {item.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.imageUrl} alt="" className="size-12 shrink-0 rounded-xl object-cover" />
                            ) : (
                              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                                <UtensilsCrossed className="size-4" />
                              </span>
                            )}
                            {dineIn && order.status !== "CANCELED" ? (
                              <button
                                type="button"
                                onClick={() => onToggleItem(item.id)}
                                disabled={posBusy}
                                aria-pressed={served}
                                className={cn(
                                  "flex size-6 shrink-0 items-center justify-center rounded-md border",
                                  served
                                    ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-700"
                                    : "border-border bg-background",
                                )}
                              >
                                <Check className="size-3.5" />
                              </button>
                            ) : null}
                            <span className={cn("min-w-0", served && "text-muted-foreground line-through")}>
                              <span className="block truncate font-medium">{item.name}</span>
                              {item.storeName ? (
                                <span className="block truncate text-[11px] text-muted-foreground">{item.storeName}</span>
                              ) : null}
                            </span>
                          </span>
                        </td>
                        <td className="px-2 text-center">{item.quantity}</td>
                        <td className="px-2 text-center text-muted-foreground">{formatMoney(item.unitPrice)}</td>
                        <td className="px-2 text-end font-medium">{formatMoney(item.unitPrice * item.quantity)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mx-5 mb-4 rounded-2xl bg-muted/40 px-4 py-3">
          <p className="text-[11px] font-medium text-muted-foreground">{t("vendor.extraNotes")}</p>
          <p className="mt-1 text-sm">{notes || t("vendor.noNotes")}</p>
          {order.status === "CANCELED" && order.cancelReason ? (
            <p className="mt-2 text-sm text-destructive">{order.cancelReason}</p>
          ) : null}
        </div>

        <footer className="flex flex-wrap items-center gap-2 border-t border-border/60 bg-muted/20 px-5 py-3">
          <p className="text-sm font-semibold">
            {t("vendor.orderTotal")}: {formatMoney(order.total)} {PRICE_CURRENCY}
          </p>
          <div className="ms-auto flex flex-wrap gap-2">
            {dineIn && order.status !== "CANCELED" ? (
              <Button variant="outline" onPress={onAddItem} isDisabled={posBusy}>
                <Plus className="size-3.5" />
                {t("vendor.addTableItem")}
              </Button>
            ) : null}
            <Button variant="outline" onPress={onPrint}>
              <Printer className="size-3.5" />
              {t("vendor.printReceipt")}
            </Button>
            {vendorCanCancel(order.status) ? (
              <Button variant="destructive" onPress={onCancel} isDisabled={pending}>
                {t("vendor.cancelOrder")}
              </Button>
            ) : null}
          </div>
        </footer>
      </article>
    </div>
  );
}
