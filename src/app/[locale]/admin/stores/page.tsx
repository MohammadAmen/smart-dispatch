import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";

import { AdminStoresBoard } from "@/components/stores/admin-stores-board";
import { isLocale, LOCALES } from "@/i18n/config";
import { isSuperAdminRole } from "@/lib/auth/constants";
import { readSession } from "@/lib/auth/server";
import { listStoreDrivers, listStoreOwners, listStores } from "@/lib/stores/service";
import { listStoreTypes } from "@/lib/stores/store-types";

export const dynamic = "force-dynamic";
export const dynamicParams = false;

export function generateStaticParams(): { locale: string }[] {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleAdminStoresPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<ReactNode> {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const session = await readSession();
  if (!session || !isSuperAdminRole(session.role)) {
    redirect(`/${locale}/login`);
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
