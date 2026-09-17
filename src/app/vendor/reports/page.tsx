import type { ReactNode } from "react";

import { VendorReportsBoard } from "@/components/stores/vendor-reports-board";
import { loadVendorCatalog } from "@/lib/stores/vendor-access";
import { loadVendorReport } from "@/lib/stores/vendor-intel";

export const dynamic = "force-dynamic";

export default async function VendorReportsPage(): Promise<ReactNode> {
  const catalog = await loadVendorCatalog("/login");
  const store = catalog.store;
  const report = store ? await loadVendorReport(store.id) : null;
  return <VendorReportsBoard store={store} report={report} />;
}
