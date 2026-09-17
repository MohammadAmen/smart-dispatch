import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import { VendorTablesBoard } from "@/components/stores/vendor-tables-board";
import { isLocale, LOCALES } from "@/i18n/config";
import { listStoreTables } from "@/lib/stores/store-tables";
import { loadVendorCatalog } from "@/lib/stores/vendor-access";

export const dynamic = "force-dynamic";
export const dynamicParams = false;

export function generateStaticParams(): { locale: string }[] {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleVendorTablesPage({
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
  const tables = store ? await listStoreTables(store.id) : [];
  return <VendorTablesBoard store={store} tables={tables} />;
}
