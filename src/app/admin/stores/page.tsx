import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AdminStoresBoard } from "@/components/stores/admin-stores-board";
import { isSuperAdminRole } from "@/lib/auth/constants";
import { readSession } from "@/lib/auth/server";
import { listStoreDrivers, listStoreOwners, listStores } from "@/lib/stores/service";
import { listStoreTypes } from "@/lib/stores/store-types";

export const dynamic = "force-dynamic";

export default async function AdminStoresPage(): Promise<ReactNode> {
  const session = await readSession();
  if (!session || !isSuperAdminRole(session.role)) {
    redirect("/login");
  }

  const [stores, owners, drivers, storeTypes] = await Promise.all([
    listStores(),
    listStoreOwners(),
    listStoreDrivers(),
    listStoreTypes(),
  ]);

  return (
    <AdminStoresBoard stores={stores} owners={owners} drivers={drivers} storeTypes={storeTypes} />
  );
}
