"use client";

import type { ReactNode } from "react";

import { MenuBottomNav } from "@/components/menu/menu-bottom-nav";
import { MenuCartHost } from "@/components/menu/menu-cart-host";
import { MenuTabLoader } from "@/components/menu/menu-tab-loader";
import { MotionProvider } from "@/components/providers/motion-provider";

/**
 * Menu shell. MotionProvider wraps chrome + cart so any residual `m` nodes work,
 * while the checkout sheet itself portals to body with CSS (no LazyMotion dependency).
 */
export function MenuChrome({ children }: { children: ReactNode }): ReactNode {
  return (
    <MotionProvider>
      <div className="pb-[calc(4.85rem+env(safe-area-inset-bottom))]">
        {children}
        <MenuCartHost />
        <MenuTabLoader />
        <MenuBottomNav />
      </div>
    </MotionProvider>
  );
}
