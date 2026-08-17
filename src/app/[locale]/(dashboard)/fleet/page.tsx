import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import { FleetBoard } from "@/components/fleet/fleet-board";
import { isLocale, LOCALES } from "@/i18n/config";
import { listFleetVehicles } from "@/lib/fleet/service";

export const dynamic = "force-dynamic";
export const dynamicParams = false;

export function generateStaticParams(): { locale: string }[] {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleFleetPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<ReactNode> {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  try {
    const vehicles = await listFleetVehicles();
    return <FleetBoard initialVehicles={vehicles} />;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load fleet.";
    return <FleetBoard initialVehicles={[]} error={message} />;
  }
}
