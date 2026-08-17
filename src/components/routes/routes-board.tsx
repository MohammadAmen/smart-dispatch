"use client";

import { Route as RouteIcon, Sparkles } from "lucide-react";
import { useState, type ReactNode } from "react";

import { LiveMap } from "@/components/map/LiveMap";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { FadeIn, Stagger, StaggerItem } from "@/components/ui/fade-in";
import { GlassCard } from "@/components/ui/glass-card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge, type BadgeTone } from "@/components/ui/status-badge";
import { fetchDispatchOrders } from "@/lib/dispatch/client";
import { postOptimizeRoutes } from "@/lib/routes/client";
import type { SerializedRoute } from "@/lib/routes/types";
import { useToastStore } from "@/stores/toast-store";

const routeTone: Record<SerializedRoute["status"], BadgeTone> = {
  OPTIMIZED: "info",
  IN_PROGRESS: "success",
  COMPLETED: "muted",
};

export function RoutesBoard({
  initialRoutes,
  error,
}: {
  initialRoutes: SerializedRoute[];
  error?: string | null;
}): ReactNode {
  const { t } = useLocale();
  const [routes, setRoutes] = useState(initialRoutes);
  const [working, setWorking] = useState(false);

  const optimize = async (): Promise<void> => {
    setWorking(true);
    const result = await postOptimizeRoutes();
    setWorking(false);

    if (!result) {
      useToastStore.getState().push({ kind: "error" });
      return;
    }

    setRoutes((current) => {
      const ids = new Set(result.routes.map((route) => route.id));
      return [...result.routes, ...current.filter((route) => !ids.has(route.id))];
    });
    void fetchDispatchOrders();
    useToastStore.getState().push({
      kind: "synced",
      count: result.assignedCount,
    });
  };

  return (
    <div className="space-y-6">
      <FadeIn>
        <PageHeader
          title={t("routes.title")}
          description={t("routes.description")}
          action={
            <Button
              onPress={() => {
                void optimize();
              }}
              isDisabled={working}
            >
              <Sparkles data-icon="inline-start" />
              {working ? t("routes.optimizing") : t("routes.optimize")}
            </Button>
          }
        />
      </FadeIn>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {routes.length === 0 ? (
        <GlassCard hover={false}>
          <div className="flex items-start gap-3">
            <RouteIcon className="mt-0.5 size-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t("routes.empty")}</p>
          </div>
        </GlassCard>
      ) : (
        <Stagger className="grid gap-4 lg:grid-cols-2">
          {routes.map((route) => (
            <StaggerItem key={route.id}>
              <GlassCard>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{route.driver.name}</p>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      {route.driver.plateNumber ?? t("common.unassigned")}
                    </p>
                  </div>
                  <StatusBadge
                    label={t(`status.route.${route.status}`)}
                    tone={routeTone[route.status]}
                  />
                </div>
                <dl className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <div>
                    <dt className="text-xs text-muted-foreground">{t("fleet.zone")}</dt>
                    <dd className="mt-1 font-medium">
                      {route.zoneName ?? route.zone ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">{t("routes.stops")}</dt>
                    <dd className="mt-1 font-mono">{route.stopCount}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">{t("routes.distance")}</dt>
                    <dd className="mt-1 font-mono">{route.totalDistanceKm} km</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">{t("routes.eta")}</dt>
                    <dd className="mt-1 font-mono">
                      {t("analytics.minutes", { count: route.estimatedMinutes })}
                    </dd>
                  </div>
                </dl>
              </GlassCard>
            </StaggerItem>
          ))}
        </Stagger>
      )}

      <LiveMap className="h-[min(62vh,620px)] min-h-[360px]" />
    </div>
  );
}
