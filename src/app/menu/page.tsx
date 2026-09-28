import type { ReactNode } from "react";

import { MenuBoard } from "@/components/stores/menu-board";
import { MotionProvider } from "@/components/providers/motion-provider";
import { getMenuHeaderBackgroundUrl } from "@/lib/platform/app-config";
import { listLiveOffers } from "@/lib/stores/offers";
import { listDirectoryStores } from "@/lib/stores/menu";
import { listStoreTypes } from "@/lib/stores/store-types";

export const dynamic = "force-dynamic";

export default async function MenuPage({
  searchParams,
}: {
  searchParams: Promise<{ phone?: string }>;
}): Promise<ReactNode> {
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
