"use client";

import { useState, type ReactNode } from "react";
import { Banknote, Sparkles, TrendingUp, Users, Wallet } from "lucide-react";

import { VendorKpiCard } from "@/components/stores/vendor-kpi-card";
import { VendorRevenueChart } from "@/components/stores/vendor-revenue-chart";
import { useLocale } from "@/components/providers/locale-provider";
import { FadeIn } from "@/components/ui/fade-in";
import { GlassCard } from "@/components/ui/glass-card";
import { PageHeader } from "@/components/ui/page-header";
import { formatMoney, PRICE_CURRENCY } from "@/lib/stores/pricing";
import type { StoreRecord } from "@/lib/stores/types";
import type { VendorReportSummary } from "@/lib/stores/vendor-intel-types";
import { cn } from "@/lib/utils";

export function VendorReportsBoard({
  store,
  report,
}: {
  store: StoreRecord | null;
  report: VendorReportSummary | null;
}): ReactNode {
  const { t, dir } = useLocale();
  const [range, setRange] = useState<"daily" | "weekly">("daily");

  if (!store || !report) {
    return (
      <FadeIn>
        <PageHeader title={t("vendor.reports")} description={t("vendor.noStore")} />
      </FadeIn>
    );
  }

  const money = (value: number): string => `${formatMoney(value)} ${PRICE_CURRENCY}`;

  return (
    <FadeIn className="space-y-6">
      <PageHeader title={t("vendor.reports")} description={t("vendor.reportsDesc")} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <VendorKpiCard
          label={t("vendor.kpiNetRevenue")}
          value={money(report.revenue)}
          icon={Banknote}
          growth={report.revenueGrowth}
          growthHint={t("vendor.kpiVsPrev")}
        />
        <VendorKpiCard
          label={t("vendor.statOrders")}
          value={String(report.completedOrders)}
          icon={TrendingUp}
        />
        <VendorKpiCard
          label={t("vendor.kpiRetention")}
          value={`${report.retentionRate.toFixed(1)}%`}
          icon={Users}
          footer={
            <p className="text-xs text-muted-foreground">
              {t("vendor.kpiReturningShare", { percent: Math.round(report.retentionRate) })}
              {" · "}
              {t("vendor.kpiNewShare", { percent: Math.round(report.newCustomerRate) })}
            </p>
          }
        />
        <VendorKpiCard
          label={t("vendor.kpiAov")}
          value={money(report.averageOrder)}
          icon={Wallet}
          growth={report.aovGrowth}
          growthHint={t("vendor.kpiVsPrev")}
        />
      </div>

      <GlassCard hover={false} className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-lg font-semibold">{t("vendor.salesChart")}</h2>
          <div className="flex rounded-full bg-muted/70 p-0.5">
            {(["daily", "weekly"] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setRange(key)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  range === key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t(key === "daily" ? "vendor.chartDaily" : "vendor.chartWeekly")}
              </button>
            ))}
          </div>
        </div>
        <VendorRevenueChart
          data={range === "daily" ? report.daily : report.weekly}
          dir={dir}
          gainedLabel={t("vendor.chartGained")}
          lostLabel={t("vendor.chartLost")}
        />
      </GlassCard>

      <GlassCard className="relative overflow-hidden space-y-3">
        <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-primary/12 via-transparent to-amber-400/10" />
        <div className="relative flex items-start gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="size-5" />
          </span>
          <div className="space-y-2">
            <h2 className="font-heading text-lg font-semibold">{t("vendor.platformGift")}</h2>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              {t("vendor.platformGiftBody", {
                orders: report.platformValue.monthOrders,
                revenue: money(report.platformValue.monthRevenue),
                fees: money(report.platformValue.deliveryFees),
              })}
            </p>
          </div>
        </div>
      </GlassCard>
    </FadeIn>
  );
}
