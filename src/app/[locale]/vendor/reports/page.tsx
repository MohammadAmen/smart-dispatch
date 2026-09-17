import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import { VendorReportsBoard } from "@/components/stores/vendor-reports-board";
import { isLocale, LOCALES } from "@/i18n/config";
import { loadVendorCatalog } from "@/lib/stores/vendor-access";
import { loadVendorReport } from "@/lib/stores/vendor-intel";

export const dynamic = "force-dynamic";
export const dynamicParams = false;

export function generateStaticParams(): { locale: string }[] {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleVendorReportsPage({
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
  const report = store ? await loadVendorReport(store.id) : null;
  return <VendorReportsBoard store={store} report={report} />;
}
