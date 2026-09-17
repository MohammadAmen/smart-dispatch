import type { ReactNode } from "react";

import { VendorInsightsBoard } from "@/components/stores/vendor-insights-board";
import { loadVendorCatalog } from "@/lib/stores/vendor-access";
import { loadVendorInsightsDashboard } from "@/lib/stores/vendor-intel";

export const dynamic = "force-dynamic";

export default async function VendorInsightsPage(): Promise<ReactNode> {
  const catalog = await loadVendorCatalog("/login");
  const store = catalog.store;
  const dashboard = store ? await loadVendorInsightsDashboard(store.id, store.city) : null;
  return <VendorInsightsBoard store={store} dashboard={dashboard} />;
}
