import type { ReactNode } from "react";

import { MenuBoard } from "@/components/stores/menu-board";
import { MotionProvider } from "@/components/providers/motion-provider";
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
  const [stores, storeTypes, offers] = await Promise.all([
    listDirectoryStores(),
    listStoreTypes(),
    listLiveOffers(),
  ]);

  return (
    <MotionProvider>
      <div className="ambient-mesh min-h-dvh">
        <MenuBoard stores={stores} storeTypes={storeTypes} offers={offers} phone={phone?.trim() ?? ""} />
      </div>
    </MotionProvider>
  );
}
