import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AdminFinanceBoard } from "@/components/admin/admin-finance-board";
import { isSuperAdminRole } from "@/lib/auth/constants";
import { readSession } from "@/lib/auth/server";
import { loadFinanceAdminData } from "@/lib/finance/actions";

export const dynamic = "force-dynamic";

export default async function AdminFinancePage(): Promise<ReactNode> {
  const session = await readSession();
  if (!session || !isSuperAdminRole(session.role)) {
    redirect("/login");
  }

  const { snapshot, stores, drivers } = await loadFinanceAdminData();
  return (
    <AdminFinanceBoard
      config={snapshot.config}
      snapshot={snapshot}
      stores={stores}
      drivers={drivers}
    />
  );
}
