"use client";

import type { ReactNode } from "react";
import { SWRConfig } from "swr";

import { MenuBottomNav } from "@/components/menu/menu-bottom-nav";
import { MenuCartHost } from "@/components/menu/menu-cart-host";
import { MenuTabKeepAlive } from "@/components/menu/menu-tab-keep-alive";
import { MenuTabLoader } from "@/components/menu/menu-tab-loader";
import { MotionProvider } from "@/components/providers/motion-provider";

/**
 * Menu shell. Keeps primary tabs alive, shares SWR cache across screens,
 * and avoids full-page loaders on every bottom-nav tap.
 */
export function MenuChrome({ children }: { children: ReactNode }): ReactNode {
  return (
    <MotionProvider>
      <SWRConfig
        value={{
          revalidateOnFocus: false,
          revalidateOnReconnect: true,
          dedupingInterval: 30_000,
          errorRetryCount: 2,
        }}
      >
        <div className="pb-[calc(4.85rem+env(safe-area-inset-bottom))]">
          <MenuTabKeepAlive>{children}</MenuTabKeepAlive>
          <MenuCartHost />
          <MenuTabLoader />
          <MenuBottomNav />
        </div>
      </SWRConfig>
    </MotionProvider>
  );
}
