import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import { MenuApp } from "@/components/menu/menu-app";
import { MotionProvider } from "@/components/providers/motion-provider";
import { getPublicMenu } from "@/lib/stores/menu";
import { resolveDineInFromParams } from "@/lib/stores/store-tables";

export const dynamic = "force-dynamic";

export default async function MenuStorePage({
  params,
  searchParams,
}: {
  params: Promise<{ storeId: string }>;
  searchParams: Promise<{
    phone?: string;
    offer?: string;
    dineIn?: string;
    mode?: string;
    table?: string;
  }>;
}): Promise<ReactNode> {
  const { storeId } = await params;
  const { phone, offer, dineIn, mode, table } = await searchParams;
  const store = await getPublicMenu(storeId);
  if (!store) {
    notFound();
  }
  const indoor = await resolveDineInFromParams(storeId, { dineIn, mode, table });

  return (
    <MotionProvider>
      <div className="ambient-mesh min-h-dvh">
        <MenuApp
          store={store}
          phone={phone?.trim() ?? ""}
          offerId={offer?.trim() || undefined}
          dineIn={indoor}
        />
      </div>
    </MotionProvider>
  );
}
