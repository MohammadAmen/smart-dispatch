"use client";

import { useEffect } from "react";

import { playDeliverySuccessSound, playNewOrderSound } from "@/lib/audio";
import { fetchDispatchOrders, subscribeDispatchStream } from "@/lib/dispatch/client";
import { useDispatchStore } from "@/stores/dispatch-store";
import { useToastStore } from "@/stores/toast-store";

const POLL_MS = 12_000;

export function useDispatchLiveSync(): void {
  const hydrateOrders = useDispatchStore((state) => state.hydrateOrders);

  useEffect(() => {
    let cancelled = false;

    const pull = async (): Promise<void> => {
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        return;
      }

      const orders = await fetchDispatchOrders();
      if (cancelled || !orders) {
        return;
      }

      hydrateOrders(orders);
    };

    void pull();

    const unsubscribe = subscribeDispatchStream((event) => {
      if (event.type === "connected") {
        return;
      }

      if (event.type === "order.created") {
        playNewOrderSound();
        useToastStore.getState().push({
          kind: "incoming",
          entityId: event.orderNumber,
        });
        void pull();
        return;
      }

      if (event.type === "order.delivered") {
        playDeliverySuccessSound();
        void pull();
        return;
      }

      void pull();
    });

    const poll = window.setInterval(() => {
      void pull();
    }, POLL_MS);

    const onOnline = (): void => {
      void pull();
    };

    window.addEventListener("online", onOnline);

    return () => {
      cancelled = true;
      unsubscribe();
      window.clearInterval(poll);
      window.removeEventListener("online", onOnline);
    };
  }, [hydrateOrders]);
}
