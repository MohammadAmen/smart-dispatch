import type { ReactNode } from "react";

import { VendorPayoutsBoard } from "@/components/stores/vendor-payouts-board";
import { loadVendorPayoutsData } from "@/lib/finance/payout-actions";
import { loadVendorCatalog } from "@/lib/stores/vendor-access";

export const dynamic = "force-dynamic";

export default async function VendorPayoutsPage(): Promise<ReactNode> {
  const catalog = await loadVendorCatalog("/login");
  const store = catalog.store;
  if (!store) {
    const { getCompanyProfile } = await import("@/lib/finance/company-profile");
    return (
      <VendorPayoutsBoard
        storeName="—"
        pending={null}
        pendingLines={[]}
        settlements={[]}
        company={await getCompanyProfile()}
      />
    );
  }
  const data = await loadVendorPayoutsData(store.id);
  return (
    <VendorPayoutsBoard
      storeName={store.name}
      pending={data.pending}
      pendingLines={data.pendingLines}
      settlements={data.settlements}
      company={data.company}
    />
  );
}
