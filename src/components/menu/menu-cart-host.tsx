"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { MenuPersistentCart } from "@/components/menu/menu-persistent-cart";
import { publishMenuCheckoutState } from "@/lib/menu/chrome-events";
import {
  emptyCheckoutDraft,
  readCheckoutDraft,
  writeCheckoutDraft,
  type MenuCheckoutDraft,
} from "@/lib/stores/menu-checkout";
import { useMenuUiStore } from "@/stores/menu-ui-store";

function readDineInFlag(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const params = new URLSearchParams(window.location.search);
  return Boolean(params.get("table") || params.get("tableId"));
}

/** Global checkout host — always mounted; opens via menu UI store. */
export function MenuCartHost(): ReactNode {
  const pathname = usePathname();
  const checkoutOpen = useMenuUiStore((state) => state.checkoutOpen);
  const setCheckoutOpen = useMenuUiStore((state) => state.setCheckoutOpen);
  const [draft, setDraft] = useState<MenuCheckoutDraft>(() => emptyCheckoutDraft());
  const [hydrated, setHydrated] = useState(false);
  const [locating, setLocating] = useState(false);
  const [dineIn, setDineIn] = useState(false);
  const writeTimer = useRef<number | null>(null);

  useEffect(() => {
    setDraft(readCheckoutDraft());
    setHydrated(true);
  }, []);

  useEffect(() => {
    setDineIn(readDineInFlag());
  }, [pathname]);

  useEffect(() => {
    publishMenuCheckoutState(checkoutOpen);
    return () => {
      if (checkoutOpen) {
        publishMenuCheckoutState(false);
      }
    };
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
      onCheckoutOpenChange={setCheckoutOpen}
    />
  );
}
