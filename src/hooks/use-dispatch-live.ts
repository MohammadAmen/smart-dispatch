"use client";

import { useEffect, useRef } from "react";

import { playDeliverySuccessSound, playNewOrderSound } from "@/lib/audio";
import { fetchDispatchOrders, subscribeDispatchStream } from "@/lib/dispatch/client";
import {
  selectPendingAssignCount,
  useDispatchStore,
} from "@/stores/dispatch-store";
import { useToastStore } from "@/stores/toast-store";

const POLL_MS = 12_000;
const AUTO_ASSIGN_MS = 15_000;

export function useDispatchLiveSync(): void {
  const hydrateOrders = useDispatchStore((state) => state.hydrateOrders);
  const lastAutoAt = useRef(0);

  useEffect(() => {
    let cancelled = false;

    const runQuietAutoAssign = (): void => {
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        return;
      }

      const state = useDispatchStore.getState();
      if (state.isAutoDispatching) {
        return;
      }
      if (selectPendingAssignCount(state) === 0) {
        return;
      }

      const now = Date.now();
      if (now - lastAutoAt.current < AUTO_ASSIGN_MS) {
        return;
      }
      lastAutoAt.current = now;
      void state.autoDispatch({ quiet: true });
    };

    const pull = async (): Promise<void> => {
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        return;
      }

      const orders = await fetchDispatchOrders();
      if (cancelled || !orders) {
        return;
      }

      hydrateOrders(orders);
      runQuietAutoAssign();
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

      if (event.type === "orders.assigned") {
        void pull();
        return;
      }

      void pull();
    });

    const poll = window.setInterval(() => {
      void pull();
    }, POLL_MS);

    const autoTimer = window.setInterval(() => {
      runQuietAutoAssign();
    }, AUTO_ASSIGN_MS);

    const onOnline = (): void => {
      void pull();
    };

    window.addEventListener("online", onOnline);

    return () => {
      cancelled = true;
      unsubscribe();
      window.clearInterval(poll);
      window.clearInterval(autoTimer);
      window.removeEventListener("online", onOnline);
    };
  }, [hydrateOrders]);
}
