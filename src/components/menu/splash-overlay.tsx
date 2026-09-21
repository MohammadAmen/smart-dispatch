"use client";

import { m } from "framer-motion";
import type { ReactNode } from "react";

import { MenuSafeImage } from "@/components/menu/menu-safe-image";
import { MenuTableBadge } from "@/components/menu/menu-table-badge";
import { storeTypeIcon } from "@/lib/stores/category-icon";
import type { MenuStore } from "@/lib/stores/types";

export function SplashOverlay({
  store,
  welcome,
  exploreLabel,
  tableLabel,
  tableText,
  sessionCode,
  sessionText,
  onExplore,
}: {
  store: MenuStore;
  welcome: string;
  exploreLabel: string;
  tableLabel?: string | null;
  tableText?: string;
  sessionCode?: string;
  sessionText?: string;
  onExplore: () => void;
}): ReactNode {
  const StoreTypeIcon = storeTypeIcon(store.storeType.icon);

  return (
    <m.div
      className="fixed inset-0 z-[90] flex flex-col items-center justify-center px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.03 }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
    >
      <MenuSafeImage
        src={store.coverImage}
        alt=""
        className="absolute inset-0 size-full object-cover"
        fallback={<span className="absolute inset-0 bg-linear-to-br from-primary via-info/70 to-secondary" />}
      />
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xl" />

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center text-center">
        <div className="relative size-28 rounded-full p-[3px] shadow-[0_24px_48px_-18px_rgba(0,0,0,0.55)] ring-4 ring-white/15">
          <div className="glass-strong size-full overflow-hidden rounded-full">
            <MenuSafeImage
              src={store.logoUrl}
              alt={store.name}
              className="size-full object-cover"
              fallback={
                <span className="flex size-full items-center justify-center bg-primary/18 text-primary">
                  <StoreTypeIcon className="size-10" />
                </span>
              }
            />
          </div>
        </div>

        <p className="mt-6 font-heading text-2xl font-bold tracking-tight text-white drop-shadow-md">
          {welcome}
        </p>
        <p className="mt-1 text-sm font-medium text-white/70">{store.name}</p>

        {tableLabel ? (
          <div className="mt-5">
            <MenuTableBadge
              tableLabel={tableLabel}
              sessionCode={sessionCode}
              tableText={tableText ?? tableLabel}
              sessionText={sessionText}
              className="border-white/20 bg-white/10 text-white"
            />
          </div>
        ) : null}

        <m.button
          type="button"
          onClick={onExplore}
          whileTap={{ scale: 0.98 }}
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="mt-8 h-14 w-full rounded-full bg-primary font-heading text-base font-bold text-primary-foreground shadow-[0_18px_40px_-12px_color-mix(in_oklch,var(--primary)_75%,transparent)]"
        >
          {exploreLabel}
        </m.button>
      </div>
    </m.div>
  );
}
