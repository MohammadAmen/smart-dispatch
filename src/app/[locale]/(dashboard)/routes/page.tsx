import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import { RoutesBoard } from "@/components/routes/routes-board";
import { isLocale, LOCALES } from "@/i18n/config";
import { listRoutes } from "@/lib/routes/optimize";

export const dynamic = "force-dynamic";
export const dynamicParams = false;

export function generateStaticParams(): { locale: string }[] {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleRoutesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<ReactNode> {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  try {
    const routes = await listRoutes();
    return <RoutesBoard initialRoutes={routes} />;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load routes.";
    return <RoutesBoard initialRoutes={[]} error={message} />;
  }
}
