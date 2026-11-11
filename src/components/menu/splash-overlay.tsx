"use client";

import { m } from "framer-motion";
import { LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { MenuSafeImage } from "@/components/menu/menu-safe-image";
import { MenuTableBadge } from "@/components/menu/menu-table-badge";
import { storeTypeIcon } from "@/lib/stores/category-icon";
import type { MenuStore } from "@/lib/stores/types";

/** Brief branded beat — long enough to feel intentional, short enough not to annoy. */
const SPLASH_AUTO_MS = 1400;

export function SplashOverlay({
  store,
  welcome,
  tableLabel,
  tableText,
  sessionCode,
  sessionText,
  onExplore,
}: {
  store: MenuStore;
  welcome: string;
  tableLabel?: string | null;
  tableText?: string;
  sessionCode?: string;
  sessionText?: string;
  onExplore: () => void;
}): ReactNode {
  const StoreTypeIcon = storeTypeIcon(store.storeType.icon);
  const onExploreRef = useRef(onExplore);
  onExploreRef.current = onExplore;
  const [mounted, setMounted] = useState(false);
  const cover = store.coverImage?.trim() || "";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      onExploreRef.current();
    }, SPLASH_AUTO_MS);
    return () => window.clearTimeout(timer);
  }, []);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <m.div
      className="fixed inset-0 z-[200] overflow-hidden bg-black"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {cover ? (
        // Native img so the photo stays position:absolute and covers the viewport.
        // MenuSafeImage forces relative, which letterboxes the cover in the middle.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cover}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
          draggable={false}
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#3f3f46_0%,#09090b_70%)]" />
      )}

      <div className="absolute inset-0 bg-black/50" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.15)_0%,rgba(0,0,0,0.28)_42%,rgba(0,0,0,0.72)_100%)]" />

      <div className="relative z-10 flex h-full flex-col items-center justify-center px-8 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] text-center">
        <m.div
          initial={{ opacity: 0, y: 10, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="flex w-full max-w-sm flex-col items-center"
        >
          <div className="relative size-32 rounded-full p-[3px] shadow-[0_30px_70px_-20px_rgba(0,0,0,0.85)] ring-1 ring-white/30">
            <div className="absolute -inset-3 rounded-full bg-white/10 blur-2xl" />
            <div className="relative size-full overflow-hidden rounded-full bg-black ring-4 ring-white/90">
              <MenuSafeImage
                src={store.logoUrl}
                alt={store.name}
                priority
                className="size-full object-cover"
                fallback={
                  <span className="flex size-full items-center justify-center bg-zinc-900 text-white">
                    <StoreTypeIcon className="size-12" />
                  </span>
                }
              />
            </div>
          </div>

          <p className="mt-7 font-heading text-[1.65rem] font-bold leading-tight tracking-tight text-white drop-shadow-[0_8px_24px_rgba(0,0,0,0.65)]">
            {welcome}
          </p>
          <p className="mt-2 text-sm font-medium tracking-wide text-white/75">{store.name}</p>

          {tableLabel ? (
            <div className="mt-5">
              <MenuTableBadge
                tableLabel={tableLabel}
                sessionCode={sessionCode}
                tableText={tableText ?? tableLabel}
                sessionText={sessionText}
                className="border-white/25 bg-black/30 text-white"
              />
            </div>
          ) : null}

          <LoaderCircle className="mt-8 size-5 animate-spin text-white/80" aria-hidden />
        </m.div>
      </div>
    </m.div>,
    document.body,
  );
}
