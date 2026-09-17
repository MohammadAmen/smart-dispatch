"use client";

import { useEffect, useRef } from "react";

import { expireOffersAction } from "@/lib/stores/actions";
import { useToastStore } from "@/stores/toast-store";

const POLL_MS = 8000;

export function VendorOfferAlerts({ storeId }: { storeId: string | null }): null {
  const seenIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!storeId) {
      return;
    }

    let cancelled = false;

    const pull = async (): Promise<void> => {
      const result = await expireOffersAction(storeId);
      if (cancelled || !result.ok) {
        return;
      }

      for (const offer of result.expired) {
        if (seenIds.current.has(offer.id)) {
          continue;
        }
        seenIds.current.add(offer.id);
        useToastStore.getState().push({
          kind: "offerExpired",
          entityId: offer.title,
        });
      }
    };

    void pull();
    const timer = window.setInterval(() => {
      void pull();
    }, POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [storeId]);

  return null;
}
