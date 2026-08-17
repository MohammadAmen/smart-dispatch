"use client";

import { AnimatePresence, m } from "framer-motion";
import { Clock3, MapPinned, Phone, Truck, UserRound, Weight } from "lucide-react";
import type { ReactNode } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { StatusBadge, type BadgeTone } from "@/components/ui/status-badge";
import {
  formatCoord,
  type DispatchStatus,
  type LiveOrder,
} from "@/lib/live-map";
import { pickLocalized } from "@/lib/localized";
import { cn } from "@/lib/utils";
import { useDispatchStore } from "@/stores/dispatch-store";

const orderTone: Record<DispatchStatus, BadgeTone> = {
  PENDING: "info",
  ASSIGNED: "warning",
  IN_TRANSIT: "success",
  DELIVERED: "muted",
  CANCELED: "destructive",
};

interface OrderQueueCardProps {
  order: LiveOrder;
  selected: boolean;
  detailsOpen: boolean;
}

export function OrderQueueCard({
  order,
  selected,
  detailsOpen,
}: OrderQueueCardProps): ReactNode {
  const { t, locale } = useLocale();
  const selectOrder = useDispatchStore((state) => state.selectOrder);
  const toggleDetails = useDispatchStore((state) => state.toggleDetails);
  const autoAssign = useDispatchStore((state) => state.autoAssign);
  const cancelOrder = useDispatchStore((state) => state.cancelOrder);
  const isAutoDispatching = useDispatchStore((state) => state.isAutoDispatching);
  const canAssign = order.status === "PENDING";
  const canCancel =
    order.status === "PENDING" ||
    order.status === "ASSIGNED" ||
    order.status === "IN_TRANSIT";

  return (
    <m.article
      layout
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "glass overflow-hidden rounded-2xl",
        selected &&
          "ring-2 ring-primary/70 shadow-[0_16px_40px_-24px_oklch(0.55_0.12_195)]",
      )}
    >
      <button
        type="button"
        onClick={() => selectOrder(order.id)}
        className="w-full p-4 text-start"
      >
        <div className="flex items-start justify-between gap-2">
          <p className="font-mono text-xs font-semibold">{order.id}</p>
          <StatusBadge
            label={
              order.delayed
                ? t("status.order.delayed")
                : t(`status.order.${order.status}`)
            }
            tone={order.delayed ? "warning" : orderTone[order.status]}
          />
        </div>
        <p className="mt-2 text-sm font-medium">
          {pickLocalized(order.destination, locale)}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Truck className="size-3.5" />
            {order.vehicleId} · {order.driverName}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock3 className="size-3.5" />
            {t("map.eta")} {order.eta}
          </span>
        </div>
        {order.status === "IN_TRANSIT" ? (
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-muted">
            <m.span
              className="block h-full w-full origin-start rounded-full bg-primary"
              initial={false}
              animate={{ scaleX: order.progress }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
        ) : null}
      </button>

      <div className="flex flex-wrap gap-1.5 border-t border-border/70 px-3 py-2.5">
        {canAssign ? (
          <Button
            variant="outline"
            size="xs"
            isDisabled={isAutoDispatching}
            onPress={() => {
              void autoAssign(order.id);
            }}
          >
            {t("dispatch.autoAssign")}
          </Button>
        ) : null}
        {canCancel ? (
          <Button
            variant="destructive"
            size="xs"
            onPress={() => {
              void cancelOrder(order.id);
            }}
          >
            {t("dispatch.cancel")}
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="xs"
          onPress={() => toggleDetails(order.id)}
        >
          {detailsOpen ? t("dispatch.hideDetails") : t("dispatch.viewDetails")}
        </Button>
      </div>

      <AnimatePresence initial={false}>
        {detailsOpen ? (
          <m.dl
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-border/70"
          >
            <div className="grid gap-2 px-4 py-3 text-[11px]">
              <DetailRow
                icon={UserRound}
                label={t("dispatch.driver")}
                value={order.driverName}
              />
              <DetailRow
                icon={Phone}
                label={t("dispatch.phone")}
                value={order.customerPhone}
              />
              <DetailRow
                icon={Weight}
                label={t("orders.weight")}
                value={order.weight}
              />
              <DetailRow
                icon={MapPinned}
                label={t("dispatch.coordinates")}
                value={`${formatCoord(order.driver[0])}, ${formatCoord(order.driver[1])} → ${formatCoord(order.destinationPoint[0])}, ${formatCoord(order.destinationPoint[1])}`}
              />
            </div>
          </m.dl>
        ) : null}
      </AnimatePresence>
    </m.article>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Phone;
  label: string;
  value: string;
}): ReactNode {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <dt className="text-muted-foreground">{label}</dt>
        <dd className="font-medium text-foreground">{value}</dd>
      </div>
    </div>
  );
}
