import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import { SettingsPage } from "@/components/settings/settings-page";
import { isLocale, LOCALES } from "@/i18n/config";

export const dynamicParams = false;

export function generateStaticParams(): { locale: string }[] {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<ReactNode> {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  return <SettingsPage />;
}
