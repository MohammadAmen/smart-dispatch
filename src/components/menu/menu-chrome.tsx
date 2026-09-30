"use client";

import { Suspense, type ReactNode } from "react";

import { MenuBottomNav } from "@/components/menu/menu-bottom-nav";
import { MenuCartHost } from "@/components/menu/menu-cart-host";

export function MenuChrome({ children }: { children: ReactNode }): ReactNode {
  return (
    <div className="pb-[calc(4.85rem+env(safe-area-inset-bottom))]">
      {children}
      <Suspense fallback={null}>
        <MenuCartHost />
        <MenuBottomNav />
      </Suspense>
    </div>
  );
}
