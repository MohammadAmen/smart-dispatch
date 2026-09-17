import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import { VendorOffersBoard } from "@/components/stores/vendor-offers-board";
import { offerDraftFromQuery } from "@/lib/stores/offer-draft";
import { isLocale, LOCALES } from "@/i18n/config";
import { loadVendorCatalog } from "@/lib/stores/vendor-access";

export const dynamic = "force-dynamic";
export const dynamicParams = false;

export function generateStaticParams(): { locale: string }[] {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleVendorOffersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ productId?: string; discount?: string; name?: string }>;
}): Promise<ReactNode> {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const catalog = await loadVendorCatalog(`/${locale}/login`);
  const query = await searchParams;
  return (
    <VendorOffersBoard
      store={catalog.store}
      categories={catalog.categories}
      products={catalog.products}
      offers={catalog.offers}
      draftOffer={offerDraftFromQuery(catalog.products, query)}
    />
  );
}
