import type { ReactNode } from "react";

import { VendorCategoriesBoard } from "@/components/stores/vendor-categories-board";
import { listGlobalCategoriesForStoreType } from "@/lib/stores/global-categories-admin";
import { loadVendorCatalog } from "@/lib/stores/vendor-access";

export const dynamic = "force-dynamic";

export default async function VendorCategoriesPage(): Promise<ReactNode> {
  const catalog = await loadVendorCatalog("/login");
  const globalCategories = catalog.store?.storeTypeId
    ? await listGlobalCategoriesForStoreType(catalog.store.storeTypeId)
    : [];

  return (
    <VendorCategoriesBoard
      store={catalog.store}
      categories={catalog.categories}
      globalCategories={globalCategories}
    />
  );
}
