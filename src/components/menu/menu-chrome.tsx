"use client";

import { Suspense, type ReactNode } from "react";

import { BeevLoader } from "@/components/brand/beev-loader";
import { MenuBottomNav } from "@/components/menu/menu-bottom-nav";
import { MenuCartHost } from "@/components/menu/menu-cart-host";
import { MenuTabLoader } from "@/components/menu/menu-tab-loader";

export function MenuChrome({ children }: { children: ReactNode }): ReactNode {
  return (
    <div className="pb-[calc(4.85rem+env(safe-area-inset-bottom))]">
      {children}
      <Suspense fallback={<BeevLoader variant="overlay" />}>
        <MenuTabLoader />
        <MenuCartHost />
        <MenuBottomNav />
      </Suspense>
    </div>
  );
}
