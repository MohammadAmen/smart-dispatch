import type { ReactNode } from "react";

import { VendorProductCreateBoard } from "@/components/stores/vendor-product-create-board";
import { loadVendorCatalog } from "@/lib/stores/vendor-access";

export const dynamic = "force-dynamic";

export default async function VendorProductNewPage({
  searchParams,
}: {
  searchParams: Promise<{ add?: string }>;
}): Promise<ReactNode> {
  const catalog = await loadVendorCatalog("/login");
  const { add } = await searchParams;
  return (
    <VendorProductCreateBoard
      store={catalog.store}
      categories={catalog.categories}
      draftName={add?.trim() ?? ""}
    />
  );
}
