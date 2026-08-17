import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import { ZonesBoard } from "@/components/catalog/zones-board";
import { isLocale, LOCALES } from "@/i18n/config";
import { listZones } from "@/lib/catalog/zones";

export const dynamic = "force-dynamic";
export const dynamicParams = false;

export function generateStaticParams(): { locale: string }[] {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleZonesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<ReactNode> {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  try {
    const zones = await listZones();
    return <ZonesBoard initialZones={zones} />;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load zones.";
    return <ZonesBoard initialZones={[]} error={message} />;
  }
}
