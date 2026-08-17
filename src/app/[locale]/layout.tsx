import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import { LocaleFromRoute } from "@/components/providers/locale-from-route";
import { isLocale } from "@/i18n/config";

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}): Promise<ReactNode> {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  return (
    <>
      <LocaleFromRoute locale={locale} />
      {children}
    </>
  );
}
