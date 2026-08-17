"use client";

import { m } from "framer-motion";
import { Clock3, Navigation, Truck } from "lucide-react";
import type { ReactNode } from "react";

import { StatusBadge, type BadgeTone } from "@/components/ui/status-badge";
import type { DispatchStatus, LiveOrder } from "@/lib/live-map";
import type { Locale } from "@/lib/localized";
import { pickLocalized } from "@/lib/localized";
import { cn } from "@/lib/utils";

const orderTone: Record<DispatchStatus, BadgeTone> = {
  PENDING: "info",
  ASSIGNED: "warning",
  IN_TRANSIT: "success",
  DELIVERED: "muted",
  CANCELED: "destructive",
};

interface OrderSidePanelProps {
  orders: LiveOrder[];
  selectedId: string | null;
  locale: Locale;
  t: (path: string, vars?: Record<string, string | number>) => string;
  onSelect: (orderId: string) => void;
}

export function OrderSidePanel({
  orders,
  selectedId,
  locale,
  t,
  onSelect,
}: OrderSidePanelProps): ReactNode {
  return (
    <aside className="pointer-events-none absolute inset-y-4 start-4 z-[1000] flex w-[min(100%-2rem,20.5rem)] flex-col gap-3">
      <div className="glass pointer-events-auto rounded-2xl px-4 py-3">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          {t("map.liveOrders")}
        </p>
        <p className="mt-1 text-sm font-medium">
          {t("map.activeCount", { count: orders.length })}
        </p>
      </div>

      <m.ul
        className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pe-1"
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: {
            transition: { staggerChildren: 0.08, delayChildren: 0.12 },
          },
        }}
      >
        {orders.map((order) => {
          const selected = order.id === selectedId;

          return (
            <m.li
              key={order.id}
              variants={{
                hidden: { opacity: 0, y: 18, scale: 0.97 },
                show: {
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] },
                },
              }}
            >
              <button
                type="button"
                onClick={() => onSelect(order.id)}
                className={cn(
                  "glass pointer-events-auto w-full rounded-2xl p-4 text-start transition-shadow",
                  selected
                    ? "ring-2 ring-primary/70 shadow-[0_16px_40px_-24px_oklch(0.55_0.12_195)]"
                    : "hover:ring-1 hover:ring-primary/30",
                )}
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
                <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-primary">
                  <Navigation className="size-3.5" />
                  {t("map.focusRoute")}
                </span>
              </button>
            </m.li>
          );
        })}
      </m.ul>
    </aside>
  );
}
