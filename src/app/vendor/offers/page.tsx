import type { ReactNode } from "react";

import { VendorOffersBoard } from "@/components/stores/vendor-offers-board";
import { offerDraftFromQuery } from "@/lib/stores/offer-draft";
import { loadVendorCatalog } from "@/lib/stores/vendor-access";

export const dynamic = "force-dynamic";

export default async function VendorOffersPage({
  searchParams,
}: {
  searchParams: Promise<{ productId?: string; discount?: string; name?: string }>;
}): Promise<ReactNode> {
  const catalog = await loadVendorCatalog("/login");
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
