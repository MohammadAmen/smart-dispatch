"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

import { useDarkClass } from "@/components/map/use-dark-class";
import { useLocale } from "@/components/providers/locale-provider";
import type { DriverAssignment } from "@/lib/driver/types";
import type { LatLngTuple, LiveOrder } from "@/lib/live-map";
import { MAP_CENTER } from "@/lib/live-map";

const MapCanvas = dynamic(() => import("@/components/map/map-canvas"), {
  ssr: false,
  loading: () => <MiniMapFallback />,
});

interface DriverMiniMapProps {
  assignment: DriverAssignment;
  driverPoint: LatLngTuple | null;
}

function MiniMapFallback(): ReactNode {
  const { t } = useLocale();

  return (
    <div className="flex h-full items-center justify-center bg-muted/40">
      <span className="sr-only">{t("map.loading")}</span>
      <span className="h-10 w-10 animate-pulse rounded-full bg-primary/30" />
    </div>
  );
}

export function DriverMiniMap({
  assignment,
  driverPoint,
}: DriverMiniMapProps): ReactNode {
  const { dir, t } = useLocale();
  const isDark = useDarkClass();
  const origin = driverPoint ?? assignment.pickup ?? MAP_CENTER;

  const order: LiveOrder = {
    id: assignment.orderNumber,
    vehicleId: "DRV",
    driverName: "—",
    destination: { ar: assignment.addressText, en: assignment.addressText },
    eta: "—",
    status: assignment.status,
    delayed: false,
    driver: origin,
    destinationPoint: assignment.destination,
    progress: 0,
    customerPhone: assignment.customerPhone,
    weight: "—",
  };

  return (
    <section className="sd-live-map overflow-hidden rounded-3xl border-2 border-border">
      <div className="flex items-center justify-between bg-card/80 px-4 py-2 text-xs font-semibold tracking-wide uppercase">
        <span>{t("driver.gpsLive")}</span>
        <span className="font-mono text-muted-foreground">
          {origin[0].toFixed(4)}, {origin[1].toFixed(4)}
        </span>
      </div>
      <div className="relative h-56">
        <MapCanvas
          orders={[order]}
          selectedId={assignment.orderNumber}
          isDark={isDark}
          dir={dir}
          layout="split"
          resizeToken={`${origin[0]}-${origin[1]}`}
          onSelect={() => undefined}
        />
      </div>
    </section>
  );
}
