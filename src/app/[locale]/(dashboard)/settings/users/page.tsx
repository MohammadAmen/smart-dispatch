import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import { UsersBoard } from "@/components/users/users-board";
import { isLocale, LOCALES } from "@/i18n/config";
import { listFleetVehicles } from "@/lib/fleet/service";
import { listManagedUsers } from "@/lib/users/service";

export const dynamic = "force-dynamic";
export const dynamicParams = false;

export function generateStaticParams(): { locale: string }[] {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleUsersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<ReactNode> {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  try {
    const [users, vehicles] = await Promise.all([
      listManagedUsers(),
      listFleetVehicles(),
    ]);
    return <UsersBoard initialUsers={users} initialVehicles={vehicles} />;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load users.";
    return <UsersBoard initialUsers={[]} initialVehicles={[]} error={message} />;
  }
}
