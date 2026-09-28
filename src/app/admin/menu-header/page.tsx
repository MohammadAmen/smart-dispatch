import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AdminMenuHeaderBoard } from "@/components/stores/admin-menu-header-board";
import { isSuperAdminRole } from "@/lib/auth/constants";
import { readSession } from "@/lib/auth/server";
import { getAppConfig } from "@/lib/platform/app-config";

export const dynamic = "force-dynamic";

export default async function AdminMenuHeaderPage(): Promise<ReactNode> {
  const session = await readSession();
  if (!session || !isSuperAdminRole(session.role)) {
    redirect("/login");
  }

  const config = await getAppConfig();
  return <AdminMenuHeaderBoard config={config} />;
}
