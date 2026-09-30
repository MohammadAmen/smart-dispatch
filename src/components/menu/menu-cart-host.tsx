"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import { MenuPersistentCart } from "@/components/menu/menu-persistent-cart";
import {
  emptyCheckoutDraft,
  readCheckoutDraft,
  writeCheckoutDraft,
  type MenuCheckoutDraft,
} from "@/lib/stores/menu-checkout";

/** Global checkout host so the bottom-nav cart works on every menu route. */
export function MenuCartHost(): ReactNode {
  const searchParams = useSearchParams();
  const dineIn = Boolean(searchParams?.get("table") || searchParams?.get("tableId"));
  const [draft, setDraft] = useState<MenuCheckoutDraft>(() => emptyCheckoutDraft());
  const [hydrated, setHydrated] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    setDraft(readCheckoutDraft());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    writeCheckoutDraft(draft);
  }, [draft, hydrated]);

  const locate = useCallback((): void => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDraft((current) => ({
          ...current,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }));
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 30_000 },
    );
  }, []);

  if (dineIn) {
    return null;
  }

  return (
    <MenuPersistentCart
      draft={draft}
      locating={locating}
      checkoutOpen={checkoutOpen}
      onDraftChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
      onLocate={locate}
      onCheckoutOpenChange={setCheckoutOpen}
    />
  );
}
