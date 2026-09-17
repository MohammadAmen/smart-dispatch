import type { ReactNode } from "react";

import { VendorCategoriesBoard } from "@/components/stores/vendor-categories-board";
import { loadVendorCatalog } from "@/lib/stores/vendor-access";

export const dynamic = "force-dynamic";

export default async function VendorCategoriesPage(): Promise<ReactNode> {
  const catalog = await loadVendorCatalog("/login");
  return <VendorCategoriesBoard store={catalog.store} categories={catalog.categories} />;
}
