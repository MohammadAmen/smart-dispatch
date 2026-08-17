"use client";

import {
  Activity,
  ArrowUpRight,
  Clock3,
  Package,
  Radio,
  Truck,
} from "lucide-react";
import type { ReactNode } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { FadeIn, Stagger, StaggerItem } from "@/components/ui/fade-in";
import { LiveMap } from "@/components/map/LiveMap";
import { GlassCard } from "@/components/ui/glass-card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge, type BadgeTone } from "@/components/ui/status-badge";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import {
  activityFeed,
  fleet,
  kpiMetrics,
  shipments,
  throughput,
  type OrderStatus,
  type VehicleStatus,
} from "@/lib/mock-data";
import { pickLocalized } from "@/lib/localized";
import { cn } from "@/lib/utils";

const orderTone: Record<OrderStatus, BadgeTone> = {
  queued: "info",
  "in-transit": "success",
  delivered: "muted",
  delayed: "warning",
};

const vehicleTone: Record<VehicleStatus, BadgeTone> = {
  "en-route": "success",
  idle: "muted",
  loading: "info",
  offline: "destructive",
};

const kpiIcons = [Package, Truck, Clock3, Radio] as const;

export function DashboardOverview(): ReactNode {
  const { t, locale } = useLocale();
  const maxThroughput = Math.max(...throughput.map((point) => point.value));

  return (
    <div className="space-y-6">
      <FadeIn>
        <PageHeader
          title={t("overview.title")}
          description={t("overview.description")}
          action={
            <Button>
              {t("common.newDispatch")}
              <ArrowUpRight data-icon="inline-end" />
            </Button>
          }
        />
      </FadeIn>

      <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiMetrics.map((metric, index) => {
          const Icon = kpiIcons[index];
          return (
            <StaggerItem key={metric.id}>
              <StatCard
                label={t(`overview.kpi.${metric.id}.label`)}
                value={metric.value}
                delta={metric.delta}
                trend={metric.trend}
                hint={t(`overview.kpi.${metric.id}.hint`)}
                icon={Icon}
                delay={index * 0.04}
              />
            </StaggerItem>
          );
        })}
      </Stagger>

      <FadeIn delay={0.08}>
        <LiveMap className="h-[min(68vh,640px)] min-h-[320px]" />
      </FadeIn>

      <div className="grid gap-4 xl:grid-cols-3">
        <GlassCard className="xl:col-span-2" hover={false}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">
                {t("overview.activeShipments")}
              </h2>
              <p className="text-xs text-muted-foreground">
                {t("overview.activeShipmentsHint")}
              </p>
            </div>
            <StatusBadge label={t("common.liveFeed")} tone="success" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-start text-sm">
              <thead className="text-[11px] tracking-wide text-muted-foreground uppercase">
                <tr className="border-b border-border/80">
                  <th className="pb-3 font-medium">{t("overview.table.order")}</th>
                  <th className="pb-3 font-medium">
                    {t("overview.table.destination")}
                  </th>
                  <th className="pb-3 font-medium">
                    {t("overview.table.courier")}
                  </th>
                  <th className="pb-3 font-medium">{t("overview.table.eta")}</th>
                  <th className="pb-3 font-medium">{t("overview.table.status")}</th>
                </tr>
              </thead>
              <tbody>
                {shipments.map((shipment) => (
                  <tr
                    key={shipment.id}
                    className="border-b border-border/50 last:border-0"
                  >
                    <td className="py-3 font-mono text-xs font-medium">
                      {shipment.id}
                    </td>
                    <td className="py-3">
                      {pickLocalized(shipment.destination, locale)}
                    </td>
                    <td className="py-3 text-muted-foreground">
                      {shipment.courier}
                    </td>
                    <td className="py-3 font-mono text-xs">{shipment.eta}</td>
                    <td className="py-3">
                      <StatusBadge
                        label={t(`status.order.${shipment.status}`)}
                        tone={orderTone[shipment.status]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>

        <GlassCard hover={false}>
          <div className="mb-4 flex items-center gap-2">
            <Activity className="size-4 text-primary" />
            <h2 className="text-sm font-semibold">{t("overview.liveActivity")}</h2>
          </div>
          <ol className="space-y-4">
            {activityFeed.map((item) => (
              <li key={item.id} className="flex gap-3">
                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {t(`activity.${item.id}.title`)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t(`activity.${item.id}.detail`)}
                  </p>
                </div>
                <span className="ms-auto shrink-0 font-mono text-[11px] text-muted-foreground">
                  {item.time}
                </span>
              </li>
            ))}
          </ol>
        </GlassCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <GlassCard className="lg:col-span-3" hover={false}>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">{t("overview.throughput")}</h2>
              <p className="text-xs text-muted-foreground">
                {t("overview.throughputHint")}
              </p>
            </div>
            <span className="text-xs text-muted-foreground">{t("common.today")}</span>
          </div>
          <div className="flex h-40 items-end gap-2 sm:gap-3">
            {throughput.map((point) => (
              <div
                key={point.hour}
                className="flex min-w-0 flex-1 flex-col items-center gap-2"
              >
                <div className="flex h-32 w-full items-end rounded-xl bg-muted/50 p-1">
                  <span
                    className="block w-full rounded-lg bg-linear-to-t from-primary/70 to-info/80"
                    style={{ height: `${(point.value / maxThroughput) * 100}%` }}
                  />
                </div>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {point.hour}
                </span>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="lg:col-span-2" hover={false}>
          <div className="mb-4">
            <h2 className="text-sm font-semibold">{t("overview.fleetLoad")}</h2>
            <p className="text-xs text-muted-foreground">
              {t("overview.fleetLoadHint")}
            </p>
          </div>
          <ul className="space-y-3">
            {fleet.map((vehicle) => (
              <li key={vehicle.id} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-mono text-xs font-medium">
                    {vehicle.id}
                  </span>
                  <StatusBadge
                    label={t(`status.vehicle.${vehicle.status}`)}
                    tone={vehicleTone[vehicle.status]}
                  />
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full bg-primary",
                      vehicle.status === "offline" && "bg-muted-foreground/40",
                    )}
                    style={{ width: `${vehicle.load}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </GlassCard>
      </div>
    </div>
  );
}
