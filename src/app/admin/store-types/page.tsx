import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AdminStoreTypesBoard } from "@/components/stores/admin-store-types-board";
import { isSuperAdminRole } from "@/lib/auth/constants";
import { readSession } from "@/lib/auth/server";
import { listStoreTypes } from "@/lib/stores/store-types";

export const dynamic = "force-dynamic";

export default async function AdminStoreTypesPage(): Promise<ReactNode> {
  const session = await readSession();
  if (!session || !isSuperAdminRole(session.role)) {
    redirect("/login");
  }

  const types = await listStoreTypes();
  return <AdminStoreTypesBoard types={types} />;
}
