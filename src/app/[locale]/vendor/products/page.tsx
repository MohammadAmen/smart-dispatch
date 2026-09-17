import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import { VendorProductsBoard } from "@/components/stores/vendor-products-board";
import { isLocale, LOCALES } from "@/i18n/config";
import { loadVendorCatalog } from "@/lib/stores/vendor-access";

export const dynamic = "force-dynamic";
export const dynamicParams = false;

export function generateStaticParams(): { locale: string }[] {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleVendorProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ add?: string }>;
}): Promise<ReactNode> {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const catalog = await loadVendorCatalog(`/${locale}/login`);
  const { add } = await searchParams;
  return (
    <VendorProductsBoard
      store={catalog.store}
      categories={catalog.categories}
      products={catalog.products}
      draftName={add?.trim() ?? ""}
    />
  );
}
