import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import { VendorInsightsBoard } from "@/components/stores/vendor-insights-board";
import { isLocale, LOCALES } from "@/i18n/config";
import { loadVendorCatalog } from "@/lib/stores/vendor-access";
import { loadVendorInsightsDashboard } from "@/lib/stores/vendor-intel";

export const dynamic = "force-dynamic";
export const dynamicParams = false;

export function generateStaticParams(): { locale: string }[] {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleVendorInsightsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<ReactNode> {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const catalog = await loadVendorCatalog(`/${locale}/login`);
  const store = catalog.store;
  const dashboard = store ? await loadVendorInsightsDashboard(store.id, store.city) : null;
  return <VendorInsightsBoard store={store} dashboard={dashboard} />;
}
