import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import { VendorOverviewBoard } from "@/components/stores/vendor-overview-board";
import { isLocale, LOCALES } from "@/i18n/config";
import { loadVendorCatalog } from "@/lib/stores/vendor-access";

export const dynamic = "force-dynamic";
export const dynamicParams = false;

export function generateStaticParams(): { locale: string }[] {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleVendorDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<ReactNode> {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const catalog = await loadVendorCatalog(`/${locale}/login`);
  return (
    <VendorOverviewBoard
      store={catalog.store}
      categories={catalog.categories}
      products={catalog.products}
    />
  );
}
