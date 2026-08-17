import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import { VehicleTypesBoard } from "@/components/catalog/vehicle-types-board";
import { isLocale, LOCALES } from "@/i18n/config";
import { listVehicleTypes } from "@/lib/catalog/vehicle-types";

export const dynamic = "force-dynamic";
export const dynamicParams = false;

export function generateStaticParams(): { locale: string }[] {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleVehicleTypesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<ReactNode> {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  try {
    const types = await listVehicleTypes();
    return <VehicleTypesBoard initialTypes={types} />;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load vehicle types.";
    return <VehicleTypesBoard initialTypes={[]} error={message} />;
  }
}
