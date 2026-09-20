"use client";

import { Armchair, Bike, CalendarClock, Check, Phone, Plus, Printer } from "lucide-react";
import type { ReactNode } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { StatusBadge, type BadgeTone } from "@/components/ui/status-badge";
import { vendorCanCancel, vendorNextActionKey } from "@/lib/stores/order-status";
import type { VendorOrderRecord } from "@/lib/stores/order-types";
import { formatMoney, PRICE_CURRENCY } from "@/lib/stores/pricing";
import { cn } from "@/lib/utils";

export const ORDER_STATUS_TONE: Record<string, BadgeTone> = {
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

export function formatOrderWhen(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SY" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function guestDisplayName(order: VendorOrderRecord, t: (path: string) => string): string {
  if (
    order.fulfillment === "DINE_IN" &&
    (order.customerPhone === "COUNTER" || order.customerName === "COUNTER")
  ) {
    return t("vendor.counterGuest");
  }
  return order.customerName;
}

export function VendorOrderTicket({
  order,
  locale,
  pending,
  posBusy,
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
  onToggleItem: (itemId: string) => void;
  onServeAll: () => void;
  onAddItem: () => void;
  onAdvance: () => void;
  onCancel: () => void;
  onPrint: () => void;
}): ReactNode {
  const { t } = useLocale();
  const dineIn = order.fulfillment === "DINE_IN";
  const actionKey = vendorNextActionKey(order.status);
  const guest = guestDisplayName(order, t);
  const openItems = order.items.some((item) => item.status !== "SERVED");

  return (
    <GlassCard hover={false} className="space-y-0 overflow-hidden p-0 print:hidden">
      <header className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 pb-3">
        <div className="min-w-0 space-y-1">
          <p className="font-heading text-lg font-semibold tracking-tight">{order.orderNumber}</p>
          <p className="text-xs text-muted-foreground">{formatOrderWhen(order.createdAt, locale)}</p>
        </div>
        <StatusBadge
          label={t(`status.order.${order.status}`)}
          tone={ORDER_STATUS_TONE[order.status] ?? "muted"}
          className="normal-case tracking-normal"
        />
      </header>

      <div className="px-5 pb-4">
        <span
          className={cn(
            "inline-flex max-w-full items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
            dineIn
              ? "bg-primary/15 text-primary shadow-[0_0_18px_color-mix(in_oklch,var(--primary)_28%,transparent)]"
              : "bg-sky-500/12 text-sky-800 dark:text-sky-100",
          )}
        >
          {dineIn ? <Armchair className="size-3.5 shrink-0" /> : <Bike className="size-3.5 shrink-0" />}
          <span className="truncate">
            {dineIn
              ? t("vendor.dineInBadge", { table: order.tableLabel || order.addressText })
              : t("vendor.deliveryBadge", { name: guest })}
          </span>
        </span>
      </div>

      <div className="grid gap-2 px-5 pb-4 text-sm sm:grid-cols-2">
        {dineIn ? null : (
          <p>
            <span className="text-muted-foreground">{t("vendor.customer")}: </span>
            {guest}
          </p>
        )}
        {dineIn && order.customerPhone === "COUNTER" ? null : (
          <p className="flex items-center gap-1.5">
            <Phone className="size-3.5 text-muted-foreground" />
            {order.customerPhone}
          </p>
        )}
        {dineIn ? null : (
          <p className="sm:col-span-2">
            <span className="text-muted-foreground">{t("menu.address")}: </span>
            {order.addressText}
          </p>
        )}
        {order.storeNotes ? (
          <p className="sm:col-span-2">
            <span className="text-muted-foreground">
              {dineIn ? t("vendor.kitchenNotes") : t("vendor.storeNotes")}:{" "}
            </span>
            {order.storeNotes}
          </p>
        ) : null}
        {order.orderType === "SPECIAL_CUSTOM" ? (
          <>
            {order.scheduledDate ? (
              <p className="sm:col-span-2 flex items-center gap-1.5">
                <CalendarClock className="size-3.5 text-primary" />
                <span className="text-muted-foreground">{t("vendor.scheduledFor")}: </span>
                {formatOrderWhen(order.scheduledDate, locale)}
              </p>
            ) : null}
            {order.customNotes ? (
              <p className="sm:col-span-2">
                <span className="text-muted-foreground">{t("vendor.customNotes")}: </span>
                {order.customNotes}
              </p>
            ) : null}
            {order.quotedPrice != null ? (
              <p>
                <span className="text-muted-foreground">{t("vendor.quotedPrice")}: </span>
                {formatMoney(order.quotedPrice)} {PRICE_CURRENCY}
              </p>
            ) : null}
            {order.status === "QUOTE_ACCEPTED" ? (
              <p className="sm:col-span-2 text-xs text-muted-foreground">{t("vendor.waitingCustomer")}</p>
            ) : null}
          </>
        ) : null}
        {order.status === "CANCELED" && order.cancelReason ? (
          <p className="sm:col-span-2 text-destructive">
            <span className="text-muted-foreground">{t("vendor.canceledReason")}: </span>
            {order.cancelReason}
          </p>
        ) : null}
      </div>

      <div className="mx-5 mb-4 overflow-hidden rounded-xl border border-border/60">
        {order.customImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={order.customImage} alt="" className="h-36 w-full object-cover" />
        ) : null}
        <div className="flex items-center justify-between gap-2 bg-muted/35 px-3 py-2">
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            {t("vendor.orderItems")}
          </p>
          {dineIn && order.status !== "CANCELED" && openItems ? (
            <button
              type="button"
              onClick={onServeAll}
              disabled={posBusy}
              className="text-[11px] font-medium text-primary hover:underline disabled:opacity-50"
            >
              {t("vendor.serveAllItems")}
            </button>
          ) : null}
        </div>
        {order.items.length === 0 ? (
          <p className="px-3 py-3 text-sm text-muted-foreground">{t("vendor.noItems")}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 text-[11px] text-muted-foreground">
                <th className="px-3 py-2 text-start font-medium">{t("vendor.itemCol")}</th>
                <th className="px-2 py-2 text-start font-medium">{t("vendor.qtyPriceCol")}</th>
                <th className="px-3 py-2 text-end font-medium">{t("vendor.lineTotalCol")}</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, index) => {
                const served = item.status === "SERVED";
                return (
                  <tr
                    key={item.id || `${order.id}-${item.name}-${index}`}
                    className={cn("border-b border-border/40 last:border-b-0", served && "text-muted-foreground")}
                  >
                    <td className="px-3 py-2.5">
                      <span className="flex min-w-0 items-center gap-2">
                        {dineIn && order.status !== "CANCELED" ? (
                          <button
                            type="button"
                            onClick={() => onToggleItem(item.id)}
                            disabled={posBusy}
                            className={cn(
                              "flex size-6 shrink-0 items-center justify-center rounded-md border transition-colors",
                              served
                                ? "border-success/40 bg-success/15 text-success"
                                : "border-border bg-background hover:border-primary hover:text-primary",
                            )}
                            aria-pressed={served}
                          >
                            <Check className="size-3.5" />
                          </button>
                        ) : null}
                        <span className={cn("min-w-0 truncate", served && "line-through")}>{item.name}</span>
                        {dineIn && served ? (
                          <span className="shrink-0 text-[11px]">{t("vendor.itemServed")}</span>
                        ) : null}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-xs text-muted-foreground">
                      {t("vendor.qtyTimesPrice", {
                        qty: item.quantity,
                        price: `${formatMoney(item.unitPrice)} ${PRICE_CURRENCY}`,
                      })}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-end">
                      {formatMoney(item.unitPrice * item.quantity)} {PRICE_CURRENCY}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <p className="border-t border-border/50 bg-muted/20 px-3 py-2.5 text-sm font-semibold">
          {t("vendor.orderTotal")}: {formatMoney(order.total)} {PRICE_CURRENCY}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border/50 bg-muted/15 px-5 py-3">
        {dineIn && order.status !== "CANCELED" ? (
          <Button variant="outline" onPress={onAddItem} isDisabled={posBusy}>
            <Plus className="size-3.5" />
            {t("vendor.addTableItem")}
          </Button>
        ) : null}
        {actionKey ? (
          <Button variant="outline" onPress={onAdvance} isDisabled={pending}>
            {t("vendor.updateStatus")}
          </Button>
        ) : null}
        <Button onPress={onPrint} className="ms-auto">
          <Printer className="size-3.5" />
          {t("vendor.printReceipt")}
        </Button>
        {vendorCanCancel(order.status) ? (
          <Button variant="destructive" onPress={onCancel} isDisabled={pending}>
            {t("vendor.cancelOrder")}
          </Button>
        ) : null}
      </div>
    </GlassCard>
  );
}
