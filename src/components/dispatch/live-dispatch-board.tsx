"use client";

import dynamic from "next/dynamic";
import { useEffect, type ReactNode } from "react";

import { DispatchHeader } from "@/components/dispatch/dispatch-header";
import { OrderQueuePanel } from "@/components/dispatch/order-queue-panel";
import { useLocale } from "@/components/providers/locale-provider";
import { useDispatchLiveSync } from "@/hooks/use-dispatch-live";
import { useDispatchStore } from "@/stores/dispatch-store";

const LiveMap = dynamic(
  () => import("@/components/map/LiveMap").then((mod) => mod.LiveMap),
  {
    ssr: false,
    loading: () => <DispatchMapFallback />,
  },
);

function DispatchMapFallback(): ReactNode {
  const { t } = useLocale();

  return (
    <div className="flex h-full items-center justify-center bg-muted/30">
      <span className="sr-only">{t("map.loading")}</span>
      <span className="h-12 w-12 animate-pulse rounded-full bg-primary/25" />
    </div>
  );
}

export function LiveDispatchBoard(): ReactNode {
  useDispatchLiveSync();
  const orders = useDispatchStore((state) => state.orders);
  const selectedOrderId = useDispatchStore((state) => state.selectedOrderId);
  const selectOrder = useDispatchStore((state) => state.selectOrder);
  const tickProgress = useDispatchStore((state) => state.tickProgress);
  const queueCollapsed = useDispatchStore((state) => state.queueCollapsed);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const timer = window.setInterval(() => {
      tickProgress();
    }, 900);

    return () => window.clearInterval(timer);
  }, [tickProgress]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <DispatchHeader />
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <OrderQueuePanel />
        <div className="min-h-0 min-w-0 flex-1">
          <LiveMap
            className="h-full min-h-0 rounded-none border-0"
            orders={orders}
            selectedId={selectedOrderId}
            onSelect={selectOrder}
            showSidePanel={false}
            layout="split"
            resizeToken={queueCollapsed ? "wide" : "queue"}
          />
        </div>
      </div>
    </div>
  );
}
