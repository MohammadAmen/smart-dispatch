import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import { MenuOrderTracker } from "@/components/stores/menu-order-tracker";
import { MotionProvider } from "@/components/providers/motion-provider";
import { isLocale, LOCALES } from "@/i18n/config";

export const dynamic = "force-dynamic";
export const dynamicParams = false;

export function generateStaticParams(): { locale: string }[] {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleMenuOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
}): Promise<ReactNode> {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const { token } = await searchParams;

  return (
    <MotionProvider>
      <div className="ambient-mesh min-h-dvh">
        <MenuOrderTracker initialToken={token?.trim() ?? ""} />
      </div>
    </MotionProvider>
  );
}
