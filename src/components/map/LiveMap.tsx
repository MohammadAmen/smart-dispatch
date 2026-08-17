"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { liveOrders, type LiveOrder, type MapLayout } from "@/lib/live-map";
import { cn } from "@/lib/utils";

import { OrderSidePanel } from "./order-side-panel";
import { useDarkClass } from "./use-dark-class";

const MapCanvas = dynamic(() => import("./map-canvas"), {
  ssr: false,
  loading: () => <MapFallback />,
});

export interface LiveMapProps {
  className?: string;
  orders?: LiveOrder[];
  selectedId?: string | null;
  onSelect?: (orderId: string) => void;
  showSidePanel?: boolean;
  layout?: MapLayout;
  resizeToken?: string | number;
}

function MapFallback(): ReactNode {
  const { t } = useLocale();

  return (
    <div className="flex h-full items-center justify-center bg-muted/40">
      <span className="sr-only">{t("map.loading")}</span>
      <span className="h-10 w-10 animate-pulse rounded-full bg-primary/25" />
    </div>
  );
}

export function LiveMap({
  className,
  orders: controlledOrders,
  selectedId: controlledSelectedId,
  onSelect: controlledOnSelect,
  showSidePanel = true,
  layout = "overlay",
  resizeToken,
}: LiveMapProps): ReactNode {
  const { locale, dir, t } = useLocale();
  const isDark = useDarkClass();
  const isControlled = controlledOrders !== undefined;
  const [internalOrders, setInternalOrders] = useState<LiveOrder[]>(liveOrders);
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(
    liveOrders[0]?.id ?? null,
  );

  useEffect(() => {
    if (isControlled) {
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const timer = window.setInterval(() => {
      setInternalOrders((current) =>
        current.map((order) => {
          if (order.status !== "IN_TRANSIT") {
            return order;
          }

          const next = order.progress + 0.012;
          return { ...order, progress: next >= 0.9 ? 0.16 : next };
        }),
      );
    }, 900);

    return () => window.clearInterval(timer);
  }, [isControlled]);

  const orders = controlledOrders ?? internalOrders;
  const selectedId =
    controlledSelectedId !== undefined
      ? controlledSelectedId
      : internalSelectedId;

  const onSelect = useCallback(
    (orderId: string) => {
      if (controlledOnSelect) {
        controlledOnSelect(orderId);
        return;
      }

      setInternalSelectedId(orderId);
    },
    [controlledOnSelect],
  );

  return (
    <section
      className={cn(
        "sd-live-map relative isolate overflow-hidden rounded-2xl border border-border/80",
        className,
      )}
    >
      <div className="absolute inset-0">
        <MapCanvas
          orders={orders}
          selectedId={selectedId}
          isDark={isDark}
          dir={dir}
          layout={layout}
          resizeToken={resizeToken}
          onSelect={onSelect}
        />
      </div>
      {showSidePanel ? (
        <OrderSidePanel
          orders={orders}
          selectedId={selectedId}
          locale={locale}
          t={t}
          onSelect={onSelect}
        />
      ) : null}
    </section>
  );
}

export default LiveMap;
