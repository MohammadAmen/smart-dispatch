import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";
import { isLocale, LOCALES } from "@/i18n/config";

export const dynamicParams = false;

export function generateStaticParams(): { locale: string }[] {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleAnalyticsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<ReactNode> {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  return <AnalyticsDashboard />;
}
