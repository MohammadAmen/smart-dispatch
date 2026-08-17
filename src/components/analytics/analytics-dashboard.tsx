"use client";

import {
  Banknote,
  Clock3,
  PackageCheck,
  Timer,
  Users,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import { AnalyticsKpi } from "@/components/analytics/analytics-kpi";
import { CashReconciliation } from "@/components/analytics/cash-reconciliation";
import { LeaderboardTable } from "@/components/analytics/leaderboard-table";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/ui/fade-in";
import { GlassCard } from "@/components/ui/glass-card";
import { PageHeader } from "@/components/ui/page-header";
import {
  formatCount,
  formatJod,
  formatMinutes,
  formatPct,
} from "@/lib/analytics/format";
import type { AnalyticsPayload } from "@/lib/analytics/types";
import { cn } from "@/lib/utils";
import { useToastStore } from "@/stores/toast-store";

const TrendChart = dynamic(
  () =>
    import("@/components/analytics/trend-chart").then((mod) => mod.TrendChart),
  { ssr: false, loading: () => <ChartSkeleton /> },
);

const PeakHoursChart = dynamic(
  () =>
    import("@/components/analytics/peak-hours-chart").then(
      (mod) => mod.PeakHoursChart,
    ),
  { ssr: false, loading: () => <ChartSkeleton /> },
);

type TrendRange = "daily" | "weekly";

function ChartSkeleton(): ReactNode {
  return <div className="h-72 animate-pulse rounded-2xl bg-muted/50" />;
}

export function AnalyticsDashboard(): ReactNode {
  const { t, locale, dir } = useLocale();
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [error, setError] = useState(false);
  const [range, setRange] = useState<TrendRange>("daily");
  const [settlingId, setSettlingId] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch(`/api/analytics?locale=${locale}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        setError(true);
        return;
      }
      const body = (await response.json()) as AnalyticsPayload | { ok?: false };
      if (!body || body.ok !== true) {
        setError(true);
        return;
      }
      setData(body);
      setError(false);
    } catch {
      setError(true);
    }
  }, [locale]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSettle = useCallback(
    async (driverId: string): Promise<void> => {
      setSettlingId(driverId);
      const previous = data;
      if (previous) {
        const row = previous.cashPending.find((item) => item.driverId === driverId);
        setData({
          ...previous,
          cashPending: previous.cashPending.filter((item) => item.driverId !== driverId),
          kpis: row
            ? {
                ...previous.kpis,
                cashCollected: previous.kpis.cashCollected + row.amount,
                cashPending: Math.max(0, previous.kpis.cashPending - row.amount),
              }
            : previous.kpis,
          leaderboard: previous.leaderboard.map((item) =>
            item.driverId === driverId && row
              ? { ...item, cashCollected: item.cashCollected + row.amount }
              : item,
          ),
        });
      }

      try {
        const response = await fetch("/api/analytics/settle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ driverId }),
        });
        if (!response.ok) {
          throw new Error("settle failed");
        }
        useToastStore.getState().push({ kind: "synced", count: 1 });
        await load();
      } catch {
        if (previous) {
          setData(previous);
        }
        useToastStore.getState().push({ kind: "error" });
      } finally {
        setSettlingId(null);
      }
    },
    [data, load],
  );

  if (!data && !error) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <span className="h-12 w-12 animate-pulse rounded-full bg-primary/25" />
        <span className="sr-only">{t("analytics.loading")}</span>
      </div>
    );
  }

  if (!data) {
    return (
      <GlassCard hover={false}>
        <p className="text-sm text-muted-foreground">{t("analytics.error")}</p>
        <Button className="mt-3" onPress={() => void load()}>
          {t("analytics.retry")}
        </Button>
      </GlassCard>
    );
  }

  const trend = range === "daily" ? data.daily : data.weekly;

  return (
    <div className="space-y-6">
      <FadeIn>
        <PageHeader
          title={t("analytics.title")}
          description={t("analytics.description")}
        />
      </FadeIn>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AnalyticsKpi
          label={t("analytics.kpi.revenue.label")}
          value={formatJod(data.kpis.revenue, locale)}
          detail={t("analytics.kpi.revenue.detail", {
            collected: formatJod(data.kpis.cashCollected, locale),
          })}
          hint={t("analytics.kpi.revenue.hint")}
          icon={Banknote}
          tone="primary"
          delay={0.02}
        />
        <AnalyticsKpi
          label={t("analytics.kpi.volume.label")}
          value={`${formatCount(data.kpis.deliveredCount, locale)} / ${formatCount(data.kpis.canceledCount, locale)}`}
          detail={t("analytics.kpi.volume.detail")}
          hint={t("analytics.kpi.volume.hint")}
          icon={PackageCheck}
          tone="success"
          delay={0.08}
        />
        <AnalyticsKpi
          label={t("analytics.kpi.duration.label")}
          value={t("analytics.minutes", {
            count: formatMinutes(data.kpis.avgDeliveryMinutes, locale),
          })}
          detail={t("analytics.kpi.duration.detail")}
          hint={t("analytics.kpi.duration.hint")}
          icon={Timer}
          tone="info"
          delay={0.14}
        />
        <AnalyticsKpi
          label={t("analytics.kpi.utilization.label")}
          value={`${formatPct(data.kpis.utilizationPct, locale)}%`}
          detail={t("analytics.kpi.utilization.detail", {
            busy: formatCount(data.kpis.busyDrivers, locale),
            duty: formatCount(data.kpis.onDutyDrivers, locale),
          })}
          hint={t("analytics.kpi.utilization.hint")}
          icon={Users}
          tone="warning"
          delay={0.2}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <GlassCard hover={false} className="xl:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                {t("analytics.kicker")}
              </p>
              <h2 className="mt-1 text-sm font-semibold">
                {t("analytics.trend.title")}
              </h2>
            </div>
            <div className="flex rounded-xl bg-muted/70 p-1">
              {(["daily", "weekly"] as const).map((item) => (
                <Button
                  key={item}
                  variant="ghost"
                  size="sm"
                  onPress={() => setRange(item)}
                  className={cn(
                    "h-8 rounded-lg px-3",
                    range === item && "bg-background text-foreground shadow-sm",
                  )}
                >
                  {t(`analytics.range.${item}`)}
                </Button>
              ))}
            </div>
          </div>
          <div className="mt-4">
            <TrendChart
              data={trend}
              locale={locale}
              dir={dir}
              revenueLabel={t("analytics.trend.revenue")}
              ordersLabel={t("analytics.trend.orders")}
            />
          </div>
        </GlassCard>

        <GlassCard hover={false} className="xl:col-span-2">
          <div className="flex items-center gap-2">
            <Clock3 className="size-4 text-primary" />
            <h2 className="text-sm font-semibold">{t("analytics.peak.title")}</h2>
          </div>
          <div className="mt-4">
            <PeakHoursChart
              data={data.peakHours}
              locale={locale}
              dir={dir}
              ordersLabel={t("analytics.peak.orders")}
            />
          </div>
        </GlassCard>
      </div>

      <GlassCard hover={false}>
        <h2 className="text-sm font-semibold">{t("analytics.leaderboard.title")}</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("analytics.leaderboard.hint")}
        </p>
        <div className="mt-4">
          <LeaderboardTable rows={data.leaderboard} />
        </div>
      </GlassCard>

      <GlassCard hover={false}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">{t("analytics.cash.title")}</h2>
            <p className="mt-1 max-w-xl text-xs text-muted-foreground">
              {t("analytics.cash.description")}
            </p>
          </div>
          <p className="font-heading text-lg font-semibold">
            {formatJod(data.kpis.cashPending, locale)}
          </p>
        </div>
        <div className="mt-4">
          <CashReconciliation
            rows={data.cashPending}
            settlingId={settlingId}
            onSettle={(driverId) => {
              void onSettle(driverId);
            }}
          />
        </div>
      </GlassCard>
    </div>
  );
}
