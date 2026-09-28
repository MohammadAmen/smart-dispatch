import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import { MenuBoard } from "@/components/stores/menu-board";
import { MotionProvider } from "@/components/providers/motion-provider";
import { isLocale, LOCALES } from "@/i18n/config";
import { getMenuHeaderBackgroundUrl } from "@/lib/platform/app-config";
import { listLiveOffers } from "@/lib/stores/offers";
import { listDirectoryStores } from "@/lib/stores/menu";
import { listStoreTypes } from "@/lib/stores/store-types";

export const dynamic = "force-dynamic";
export const dynamicParams = false;

export function generateStaticParams(): { locale: string }[] {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleMenuPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ phone?: string }>;
}): Promise<ReactNode> {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const { phone } = await searchParams;
  const [stores, storeTypes, offers, headerBackgroundUrl] = await Promise.all([
    listDirectoryStores(),
    listStoreTypes(),
    listLiveOffers(),
    getMenuHeaderBackgroundUrl(),
  ]);

  return (
    <MotionProvider>
      <div className="ambient-mesh min-h-dvh">
        <MenuBoard
          stores={stores}
          storeTypes={storeTypes}
          offers={offers}
          phone={phone?.trim() ?? ""}
          headerBackgroundUrl={headerBackgroundUrl}
        />
      </div>
    </MotionProvider>
  );
}
