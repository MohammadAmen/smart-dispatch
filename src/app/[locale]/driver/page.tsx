import type { ReactNode } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DriverApp } from "@/components/driver/driver-app";
import { isLocale, LOCALES } from "@/i18n/config";
import { resolveDriverAccess } from "@/lib/driver/access";

export const dynamic = "force-dynamic";
export const dynamicParams = false;

export const metadata: Metadata = {
  title: "Driver",
  appleWebApp: {
    capable: true,
    title: "Smart Dispatch Driver",
    statusBarStyle: "black-translucent",
  },
};

export function generateStaticParams(): { locale: string }[] {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function DriverPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<ReactNode> {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const access = await resolveDriverAccess();
  return <DriverApp access={access} />;
}
