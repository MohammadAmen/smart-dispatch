import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AdminGlobalCategoriesBoard } from "@/components/stores/admin-global-categories-board";
import { isSuperAdminRole } from "@/lib/auth/constants";
import { readSession } from "@/lib/auth/server";
import { listAdminGlobalCategories } from "@/lib/stores/global-categories-admin";
import { listStoreTypes } from "@/lib/stores/store-types";

export const dynamic = "force-dynamic";

export default async function AdminGlobalCategoriesPage(): Promise<ReactNode> {
  const session = await readSession();
  if (!session || !isSuperAdminRole(session.role)) {
    redirect("/login");
  }

  const [categories, storeTypes] = await Promise.all([
    listAdminGlobalCategories(),
    listStoreTypes(),
  ]);

  return <AdminGlobalCategoriesBoard categories={categories} storeTypes={storeTypes} />;
}
