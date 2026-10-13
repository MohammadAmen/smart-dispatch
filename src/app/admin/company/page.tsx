import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AdminCompanyBoard } from "@/components/admin/admin-company-board";
import { isSuperAdminRole } from "@/lib/auth/constants";
import { readSession } from "@/lib/auth/server";
import { getCompanyProfile } from "@/lib/finance/company-profile";

export const dynamic = "force-dynamic";

export default async function AdminCompanyPage(): Promise<ReactNode> {
  const session = await readSession();
  if (!session || !isSuperAdminRole(session.role)) {
    redirect("/login");
  }

  const company = await getCompanyProfile();
  return <AdminCompanyBoard company={company} />;
}
