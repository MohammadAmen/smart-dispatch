import type { ReactNode } from "react";

import { VendorOverviewBoard } from "@/components/stores/vendor-overview-board";
import { loadVendorCatalog } from "@/lib/stores/vendor-access";

export const dynamic = "force-dynamic";

export default async function VendorDashboardPage(): Promise<ReactNode> {
  const catalog = await loadVendorCatalog("/login");
  return (
    <VendorOverviewBoard
      store={catalog.store}
      categories={catalog.categories}
      products={catalog.products}
    />
  );
}
