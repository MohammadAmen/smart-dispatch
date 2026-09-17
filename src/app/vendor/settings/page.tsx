import type { ReactNode } from "react";

import { VendorSettingsBoard } from "@/components/stores/vendor-settings-board";
import { loadVendorCatalog } from "@/lib/stores/vendor-access";

export const dynamic = "force-dynamic";

export default async function VendorSettingsPage(): Promise<ReactNode> {
  const catalog = await loadVendorCatalog("/login");
  return <VendorSettingsBoard store={catalog.store} />;
}
