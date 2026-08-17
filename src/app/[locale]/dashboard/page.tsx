import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import { LiveDispatchBoard } from "@/components/dispatch/live-dispatch-board";
import { isLocale, LOCALES } from "@/i18n/config";

export const dynamicParams = false;

export function generateStaticParams(): { locale: string }[] {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<ReactNode> {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  return <LiveDispatchBoard />;
}
