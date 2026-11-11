"use client";

import { usePathname } from "next/navigation";
import { useRef, type ReactNode } from "react";

type PrimaryTab = "home" | "favorites" | "orders" | "account";

const STORE_CACHE_LIMIT = 3;

function resolveCacheKey(pathname: string): string | null {
  const bare = pathname.replace(/^\/(ar|en)(?=\/|$)/, "") || "/";
  if (bare === "/menu" || bare === "/menu/") {
    return "home";
  }
  if (bare === "/menu/favorites" || bare.startsWith("/menu/favorites/")) {
    return "favorites";
  }
  if (bare === "/menu/orders" || bare.startsWith("/menu/orders/")) {
    return "orders";
  }
  if (bare === "/menu/account" || bare.startsWith("/menu/account/")) {
    return "account";
  }
  const storeMatch = bare.match(/^\/menu\/stores\/([^/?#]+)/);
  if (storeMatch?.[1]) {
    return `store:${storeMatch[1]}`;
  }
  return null;
}

function isPrimaryTab(key: string): key is PrimaryTab {
  return key === "home" || key === "favorites" || key === "orders" || key === "account";
}

/**
 * Keeps primary tabs + recently opened store menus mounted so products/images
 * don't flash a full reload when hopping around.
 */
export function MenuTabKeepAlive({ children }: { children: ReactNode }): ReactNode {
  const pathname = usePathname() ?? "/menu";
  const key = resolveCacheKey(pathname);
  const cacheRef = useRef<Map<string, ReactNode>>(new Map());
  const storeOrderRef = useRef<string[]>([]);

  if (key) {
    // Always refresh the active panel so RSC/client updates aren't frozen on first visit.
    cacheRef.current.set(key, children);
    if (key.startsWith("store:")) {
      storeOrderRef.current = [
        key,
        ...storeOrderRef.current.filter((entry) => entry !== key),
      ].slice(0, STORE_CACHE_LIMIT);
      for (const cachedKey of [...cacheRef.current.keys()]) {
        if (cachedKey.startsWith("store:") && !storeOrderRef.current.includes(cachedKey)) {
          cacheRef.current.delete(cachedKey);
        }
      }
    }
  }

  if (!key) {
    return children;
  }

  const entries = [...cacheRef.current.entries()];

  return (
    <div className="relative min-h-dvh">
      {entries.map(([entryKey, panel]) => {
        const active = entryKey === key;
        return (
          <div
            key={entryKey}
            className={active ? "block" : "hidden"}
            aria-hidden={!active}
            data-menu-cache={isPrimaryTab(entryKey) ? entryKey : "store"}
            {...(!active ? { inert: "" as unknown as boolean } : {})}
          >
            {panel}
          </div>
        );
      })}
    </div>
  );
}
