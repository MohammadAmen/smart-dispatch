import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AdminDeliveryPricingBoard } from "@/components/stores/admin-delivery-pricing-board";
import { isSuperAdminRole } from "@/lib/auth/constants";
import { readSession } from "@/lib/auth/server";
import { getDeliveryTiers } from "@/lib/platform/app-config";

export const dynamic = "force-dynamic";

export default async function AdminDeliveryPricingPage(): Promise<ReactNode> {
  const session = await readSession();
  if (!session || !isSuperAdminRole(session.role)) {
    redirect("/login");
  }

  const tiers = await getDeliveryTiers();
  return <AdminDeliveryPricingBoard initialTiers={tiers} />;
}
