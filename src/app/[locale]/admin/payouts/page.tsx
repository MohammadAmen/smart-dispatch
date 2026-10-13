import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AdminPayoutsBoard } from "@/components/admin/admin-payouts-board";
import { isSuperAdminRole } from "@/lib/auth/constants";
import { readSession } from "@/lib/auth/server";
import { loadAdminPayoutsData } from "@/lib/finance/payout-actions";

export const dynamic = "force-dynamic";

export default async function AdminPayoutsLocalePage(): Promise<ReactNode> {
  const session = await readSession();
  if (!session || !isSuperAdminRole(session.role)) {
    redirect("/login");
  }

  const data = await loadAdminPayoutsData();
  return (
    <AdminPayoutsBoard
      dues={data.dues}
      settlements={data.settlements}
      company={data.company}
    />
  );
}
