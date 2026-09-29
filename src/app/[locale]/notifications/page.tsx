import type { ReactElement } from "react";
import { notFound } from "next/navigation";

import { NotificationCenter } from "@/components/notifications/notification-center";
import { isLocale, LOCALES } from "@/i18n/config";

export const dynamicParams = false;

export function generateStaticParams(): { locale: string }[] {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleNotificationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<ReactElement> {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  return <NotificationCenter />;
}
