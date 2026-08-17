"use client";

import { AnimatePresence, LayoutGroup, m } from "framer-motion";
import type { ReactNode } from "react";
import { useShallow } from "zustand/react/shallow";

import { OrderQueueCard } from "@/components/dispatch/order-queue-card";
import { useLocale } from "@/components/providers/locale-provider";
import { buttonVariants } from "@/components/ui/button";
import type { DispatchFilter } from "@/lib/live-map";
import { cn } from "@/lib/utils";
import {
  selectFilteredOrders,
  useDispatchStore,
} from "@/stores/dispatch-store";

const TABS: DispatchFilter[] = [
  "ALL",
  "PENDING",
  "ASSIGNED",
  "IN_TRANSIT",
  "DELIVERED",
];

export function OrderQueuePanel(): ReactNode {
  const { t } = useLocale();
  const orders = useDispatchStore(useShallow(selectFilteredOrders));
  const allCount = useDispatchStore((state) => state.orders.length);
  const statusFilter = useDispatchStore((state) => state.statusFilter);
  const setStatusFilter = useDispatchStore((state) => state.setStatusFilter);
  const selectedOrderId = useDispatchStore((state) => state.selectedOrderId);
  const detailsOrderId = useDispatchStore((state) => state.detailsOrderId);
  const queueCollapsed = useDispatchStore((state) => state.queueCollapsed);

  if (queueCollapsed) {
    return null;
  }

  return (
    <aside className="glass-strong z-[1000] flex min-h-0 w-[min(100%-1.5rem,22.5rem)] shrink-0 flex-col max-lg:absolute max-lg:inset-y-3 max-lg:start-3 lg:relative lg:w-[22.5rem] lg:border-e">
      <div className="border-b border-border/70 px-4 py-3">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          {t("dispatch.queue")}
        </p>
        <p className="mt-1 text-sm font-medium">
          {t("dispatch.queueCount", { count: allCount })}
        </p>
      </div>

      <LayoutGroup>
        <div
          className="flex gap-1 overflow-x-auto px-3 py-2"
          role="tablist"
          aria-label={t("dispatch.queue")}
        >
          {TABS.map((tab) => {
            const active = statusFilter === tab;

            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setStatusFilter(tab)}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "xs" }),
                  "relative shrink-0",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {active ? (
                  <m.span
                    layoutId="dispatch-tab"
                    className="absolute inset-0 rounded-md bg-muted"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                ) : null}
                <span className="relative z-10">
                  {t(`dispatch.tabs.${tab}`)}
                </span>
              </button>
            );
          })}
        </div>
      </LayoutGroup>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <AnimatePresence mode="wait">
          <m.div
            key={statusFilter}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col gap-2.5"
          >
            {orders.length === 0 ? (
              <p className="glass rounded-2xl px-4 py-8 text-center text-sm text-muted-foreground">
                {t("dispatch.empty")}
              </p>
            ) : (
              <AnimatePresence initial={false}>
                {orders.map((order) => (
                  <OrderQueueCard
                    key={order.id}
                    order={order}
                    selected={order.id === selectedOrderId}
                    detailsOpen={order.id === detailsOrderId}
                  />
                ))}
              </AnimatePresence>
            )}
          </m.div>
        </AnimatePresence>
      </div>
    </aside>
  );
}
