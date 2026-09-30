"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { MenuPersistentCart } from "@/components/menu/menu-persistent-cart";
import { publishMenuCheckoutState } from "@/lib/menu/chrome-events";
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
  const writeTimer = useRef<number | null>(null);

  useEffect(() => {
    setDraft(readCheckoutDraft());
    setHydrated(true);
  }, []);

  useEffect(() => {
    publishMenuCheckoutState(checkoutOpen);
    return () => publishMenuCheckoutState(false);
  }, [checkoutOpen]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    if (writeTimer.current != null) {
      window.clearTimeout(writeTimer.current);
    }
    writeTimer.current = window.setTimeout(() => {
      writeCheckoutDraft(draft);
      writeTimer.current = null;
    }, 180);
    return () => {
      if (writeTimer.current != null) {
        window.clearTimeout(writeTimer.current);
      }
    };
  }, [draft, hydrated]);

  const onDraftChange = useCallback((patch: Partial<MenuCheckoutDraft>): void => {
    setDraft((current) => ({ ...current, ...patch }));
  }, []);

  const onCheckoutOpenChange = useCallback((open: boolean): void => {
    setCheckoutOpen(open);
  }, []);

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
      onDraftChange={onDraftChange}
      onLocate={locate}
      onCheckoutOpenChange={onCheckoutOpenChange}
    />
  );
}
