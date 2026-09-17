import type { ReactNode } from "react";

import { VendorProductsBoard } from "@/components/stores/vendor-products-board";
import { loadVendorCatalog } from "@/lib/stores/vendor-access";

export const dynamic = "force-dynamic";

export default async function VendorProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ add?: string }>;
}): Promise<ReactNode> {
  const catalog = await loadVendorCatalog("/login");
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
