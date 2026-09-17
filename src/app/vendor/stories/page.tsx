import type { ReactNode } from "react";

import { VendorStoriesBoard } from "@/components/stores/vendor-stories-board";
import { loadVendorCatalog } from "@/lib/stores/vendor-access";

export const dynamic = "force-dynamic";

export default async function VendorStoriesPage(): Promise<ReactNode> {
  const catalog = await loadVendorCatalog("/login");
  return (
    <VendorStoriesBoard
      store={catalog.store}
      products={catalog.products}
      stories={catalog.stories}
    />
  );
}
