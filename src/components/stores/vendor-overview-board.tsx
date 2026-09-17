"use client";

import Link from "next/link";
import { BarChart3, Lightbulb, Megaphone, Package, Percent, QrCode, ShoppingBag, Tags } from "lucide-react";
import type { ReactNode } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { FadeIn } from "@/components/ui/fade-in";
import { GlassCard } from "@/components/ui/glass-card";
import { PageHeader } from "@/components/ui/page-header";
import { storeUsesDineInTables } from "@/lib/stores/indoor-service";
import { isDiscountedProduct } from "@/lib/stores/pricing";
import type { CategoryRecord, ProductRecord, StoreRecord } from "@/lib/stores/types";

export function VendorOverviewBoard({
  store,
  categories,
  products,
}: {
  store: StoreRecord | null;
  categories: CategoryRecord[];
  products: ProductRecord[];
}): ReactNode {
  const { t } = useLocale();

  if (!store) {
    return (
      <FadeIn>
        <PageHeader title={t("vendor.title")} description={t("vendor.noStore")} />
      </FadeIn>
    );
  }

  const discounted = products.filter(isDiscountedProduct).length;

  return (
    <FadeIn className="space-y-6">
      <PageHeader title={store.name} description={t("vendor.overviewDesc")} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <GlassCard className="space-y-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
            <ShoppingBag className="size-5" />
          </span>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {t("vendor.orders")}
          </p>
          <p className="text-sm text-muted-foreground">{t("vendor.ordersDesc")}</p>
          <Link
            href="/vendor/orders"
            className="text-sm font-medium text-primary hover:underline"
          >
            {t("vendor.manageOrders")}
          </Link>
        </GlassCard>
        <GlassCard className="space-y-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
            <Tags className="size-5" />
          </span>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {t("vendor.categories")}
          </p>
          <p className="font-heading text-3xl font-semibold">{categories.length}</p>
          <Link
            href="/vendor/categories"
            className="text-sm font-medium text-primary hover:underline"
          >
            {t("vendor.manageCategories")}
          </Link>
        </GlassCard>
        <GlassCard className="space-y-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
            <Package className="size-5" />
          </span>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {t("vendor.products")}
          </p>
          <p className="font-heading text-3xl font-semibold">{products.length}</p>
          <Link
            href="/vendor/products"
            className="text-sm font-medium text-primary hover:underline"
          >
            {t("vendor.manageProducts")}
          </Link>
        </GlassCard>
        <GlassCard className="space-y-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
            <Megaphone className="size-5" />
          </span>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {t("vendor.offers")}
          </p>
          <p className="text-sm text-muted-foreground">{t("vendor.offersDesc")}</p>
          <Link
            href="/vendor/offers"
            className="text-sm font-medium text-primary hover:underline"
          >
            {t("vendor.manageOffers")}
          </Link>
        </GlassCard>
        <GlassCard className="space-y-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-destructive/12 text-destructive">
            <Percent className="size-5" />
          </span>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {t("vendor.discounted")}
          </p>
          <p className="font-heading text-3xl font-semibold">{discounted}</p>
        </GlassCard>
        <GlassCard className="space-y-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
            <BarChart3 className="size-5" />
          </span>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {t("vendor.reports")}
          </p>
          <p className="text-sm text-muted-foreground">{t("vendor.reportsDesc")}</p>
          <Link href="/vendor/reports" className="text-sm font-medium text-primary hover:underline">
            {t("vendor.manageReports")}
          </Link>
        </GlassCard>
        <GlassCard className="space-y-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
            <Lightbulb className="size-5" />
          </span>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {t("vendor.insights")}
          </p>
          <p className="text-sm text-muted-foreground">{t("vendor.insightsDesc")}</p>
          <Link href="/vendor/insights" className="text-sm font-medium text-primary hover:underline">
            {t("vendor.manageInsights")}
          </Link>
        </GlassCard>
        <GlassCard className="space-y-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
            <QrCode className="size-5" />
          </span>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {t(storeUsesDineInTables(store.storeType) ? "vendor.tables" : "vendor.storeQr")}
          </p>
          <p className="text-sm text-muted-foreground">
            {t(storeUsesDineInTables(store.storeType) ? "vendor.tablesDesc" : "vendor.storeQrDesc")}
          </p>
          <Link href="/vendor/tables" className="text-sm font-medium text-primary hover:underline">
            {t("vendor.manageTables")}
          </Link>
        </GlassCard>
      </div>
    </FadeIn>
  );
}
