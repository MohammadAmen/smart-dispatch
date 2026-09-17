"use client";

import Link from "next/link";
import { Banknote, Check, Clock3, Lightbulb, Plus, Search, Users, Wallet } from "lucide-react";
import type { ReactNode } from "react";

import { MenuSafeImage } from "@/components/menu/menu-safe-image";
import { VendorKpiCard } from "@/components/stores/vendor-kpi-card";
import { VendorPeakHoursChart } from "@/components/stores/vendor-peak-hours-chart";
import { VendorProductProfitChart } from "@/components/stores/vendor-product-profit-chart";
import { useLocale } from "@/components/providers/locale-provider";
import { buttonVariants } from "@/components/ui/button";
import { FadeIn } from "@/components/ui/fade-in";
import { GlassCard } from "@/components/ui/glass-card";
import { PageHeader } from "@/components/ui/page-header";
import { formatMoney, PRICE_CURRENCY } from "@/lib/stores/pricing";
import type { VendorInsightsDashboard } from "@/lib/stores/vendor-intel-types";
import type { StoreRecord } from "@/lib/stores/types";
import { cn } from "@/lib/utils";

const WIDTH_STEPS = [
  "w-0",
  "w-[5%]",
  "w-[10%]",
  "w-[15%]",
  "w-[20%]",
  "w-[25%]",
  "w-[30%]",
  "w-[35%]",
  "w-[40%]",
  "w-[45%]",
  "w-[50%]",
  "w-[55%]",
  "w-[60%]",
  "w-[65%]",
  "w-[70%]",
  "w-[75%]",
  "w-[80%]",
  "w-[85%]",
  "w-[90%]",
  "w-[95%]",
  "w-full",
] as const;

function widthStep(percent: number): string {
  const index = Math.min(20, Math.max(0, Math.round(percent / 5)));
  return WIDTH_STEPS[index];
}

function money(value: number): string {
  return `${formatMoney(value)} ${PRICE_CURRENCY}`;
}

export function VendorInsightsBoard({
  store,
  dashboard,
}: {
  store: StoreRecord | null;
  dashboard: VendorInsightsDashboard | null;
}): ReactNode {
  const { t, dir } = useLocale();

  if (!store || !dashboard) {
    return (
      <FadeIn>
        <PageHeader title={t("vendor.insights")} description={t("vendor.noStore")} />
      </FadeIn>
    );
  }

  const { kpis, searches, suggestions, topProducts, peakHours } = dashboard;
  const peak = peakHours.reduce(
    (best, row) => (row.orders > best.orders ? row : best),
    peakHours[0] ?? { hour: 0, label: "00:00", orders: 0 },
  );
  const hasPeak = peak.orders > 0;

  return (
    <FadeIn className="space-y-6">
      <PageHeader title={t("vendor.insights")} description={t("vendor.insightsDesc")} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <VendorKpiCard
          label={t("vendor.kpiNetRevenue")}
          value={money(kpis.revenue)}
          icon={Banknote}
          growth={kpis.revenueGrowth}
          growthHint={t("vendor.kpiVsPrev")}
        />
        <VendorKpiCard
          label={t("vendor.kpiAov")}
          value={money(kpis.averageOrder)}
          icon={Wallet}
          growth={kpis.aovGrowth}
          growthHint={t("vendor.kpiVsPrev")}
        />
        <VendorKpiCard
          label={t("vendor.kpiRetention")}
          value={`${kpis.retentionRate.toFixed(1)}%`}
          icon={Users}
          footer={
            <div className="space-y-2">
              <div className="flex h-2 overflow-hidden rounded-full bg-muted">
                <span className={cn("bg-primary", widthStep(kpis.retentionRate))} />
                <span className={cn("bg-sky-400/70 dark:bg-sky-300/50", widthStep(kpis.newCustomerRate))} />
              </div>
              <p className="text-xs text-muted-foreground">
                {t("vendor.kpiReturningShare", { percent: Math.round(kpis.retentionRate) })}
                {" · "}
                {t("vendor.kpiNewShare", { percent: Math.round(kpis.newCustomerRate) })}
              </p>
            </div>
          }
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <GlassCard hover={false} className="space-y-4">
          <div className="flex items-start gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
              <Search className="size-5" />
            </span>
            <div>
              <h2 className="font-heading text-lg font-semibold">{t("vendor.topSearches")}</h2>
              <p className="text-sm text-muted-foreground">{t("vendor.topSearchesHint")}</p>
            </div>
          </div>
          {searches.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("vendor.emptySearches")}</p>
          ) : (
            <ul className="space-y-2">
              {searches.map((term, index) => (
                <li
                  key={term.query}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/45 px-3 py-2.5"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {index + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{term.query}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {t("vendor.searchHits", { count: term.hits })}
                      </span>
                    </span>
                  </span>
                  {term.inCatalog ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/12 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                      <Check className="size-3.5" />
                      {t("vendor.inCatalog")}
                    </span>
                  ) : (
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/12 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                        <Lightbulb className="size-3.5" />
                        {t("vendor.newOpportunity")}
                      </span>
                      <Link
                        href={`/vendor/products?add=${encodeURIComponent(term.query)}`}
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                      >
                        <Plus data-icon="inline-start" />
                        {t("vendor.addToCatalog")}
                      </Link>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </GlassCard>

        <GlassCard hover={false} className="space-y-4">
          <div className="flex items-start gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-amber-500/12 text-amber-600 dark:text-amber-300">
              <Lightbulb className="size-5" />
            </span>
            <div>
              <h2 className="font-heading text-lg font-semibold">{t("vendor.cartAbandon")}</h2>
              <p className="text-sm text-muted-foreground">{t("vendor.cartAbandonHint")}</p>
            </div>
          </div>
          {suggestions.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("vendor.emptySmartOffers")}</p>
          ) : (
            <div className="space-y-3">
              {suggestions.map((item) => (
                <article
                  key={item.productId}
                  className="flex gap-3 rounded-2xl border border-border/60 bg-background/45 p-3"
                >
                  <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-muted">
                    <MenuSafeImage
                      src={item.imageUrl}
                      alt={item.name}
                      className="size-full object-cover"
                      fallback={<span className="block size-full bg-primary/10" />}
                    />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <p className="truncate font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {money(item.price)} · {t("vendor.cartAdds", { count: item.cartAdds })} ·{" "}
                      {t("vendor.purchases", { count: item.purchases })}
                    </p>
                    <p className="text-sm font-medium text-primary">
                      {t("vendor.suggestDiscount", { percent: item.suggestedDiscount })}
                    </p>
                    <Link
                      href={`/vendor/offers?productId=${encodeURIComponent(item.productId)}&discount=${item.suggestedDiscount}&name=${encodeURIComponent(item.name)}`}
                      className={cn(buttonVariants({ variant: "default", size: "sm" }))}
                    >
                      {t("vendor.oneClickOffer")}
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <GlassCard hover={false} className="space-y-4">
          <div>
            <h2 className="font-heading text-lg font-semibold">{t("vendor.topProfitProducts")}</h2>
            <p className="text-sm text-muted-foreground">{t("vendor.topProfitHint")}</p>
          </div>
          {topProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("vendor.emptyTopProducts")}</p>
          ) : (
            <>
              <VendorProductProfitChart
                data={topProducts}
                dir={dir}
                shareLabel={(percent) => t("vendor.salesShare", { percent })}
              />
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                {topProducts.map((row) => (
                  <li key={row.productId} className="flex items-center justify-between gap-3">
                    <span className="truncate">{row.name}</span>
                    <span className="shrink-0 font-medium text-foreground">
                      {t("vendor.salesShare", { percent: Math.round(row.share) })}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </GlassCard>

        <GlassCard hover={false} className="space-y-4">
          <div className="flex items-start gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-sky-500/12 text-sky-700 dark:text-sky-300">
              <Clock3 className="size-5" />
            </span>
            <div>
              <h2 className="font-heading text-lg font-semibold">{t("vendor.peakHours")}</h2>
              <p className="text-sm text-muted-foreground">
                {hasPeak
                  ? t("vendor.peakHoursLead", {
                      hour: peak.label,
                      count: peak.orders,
                    })
                  : t("vendor.peakHoursHint")}
              </p>
            </div>
          </div>
          {hasPeak ? (
            <VendorPeakHoursChart
              data={peakHours}
              dir={dir}
              ordersLabel={(count) => t("vendor.hourOrders", { count })}
            />
          ) : (
            <p className="text-sm text-muted-foreground">{t("vendor.emptyPeakHours")}</p>
          )}
        </GlassCard>
      </div>
    </FadeIn>
  );
}
