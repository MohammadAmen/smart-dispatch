import type { ReactNode } from "react";

import { VendorTablesBoard } from "@/components/stores/vendor-tables-board";
import { listStoreTables } from "@/lib/stores/store-tables";
import { loadVendorCatalog } from "@/lib/stores/vendor-access";

export const dynamic = "force-dynamic";

export default async function VendorTablesPage(): Promise<ReactNode> {
  const catalog = await loadVendorCatalog("/login");
  const store = catalog.store;
  const tables = store ? await listStoreTables(store.id) : [];
  return <VendorTablesBoard store={store} tables={tables} />;
}
