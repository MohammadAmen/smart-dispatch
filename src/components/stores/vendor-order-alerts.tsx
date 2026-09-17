"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { playDineInOrderSound, playNewOrderSound, unlockAudio } from "@/lib/audio";
import { listVendorOrderAlertsAction } from "@/lib/stores/actions";
import { stripLocalePrefix } from "@/lib/paths";
import { useToastStore } from "@/stores/toast-store";
import { useVendorOrdersStore } from "@/stores/vendor-orders-store";

const POLL_MS = 4000;

export function VendorOrderAlerts({ storeId }: { storeId: string | null }): null {
  const router = useRouter();
  const pathname = usePathname();
  const setPendingCount = useVendorOrdersStore((state) => state.setPendingCount);
  const seenIds = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!storeId) {
      return;
    }

    let cancelled = false;

    const pull = async (): Promise<void> => {
      const result = await listVendorOrderAlertsAction(storeId);
      if (cancelled || !result.ok) {
        return;
      }

      const previous = seenIds.current;
      const newcomers = previous
        ? result.pending.filter((order) => !previous.has(order.id))
        : [];
      if (newcomers.length > 0) {
        await unlockAudio();
        const dineInOrders = newcomers.filter((order) => order.fulfillment === "DINE_IN");
        const deliveryOrders = newcomers.filter((order) => order.fulfillment !== "DINE_IN");
        if (dineInOrders.length > 0) {
          playDineInOrderSound();
        } else {
          playNewOrderSound();
        }
        for (const order of dineInOrders) {
          useToastStore.getState().push({
            kind: "vendorDineIn",
            entityId: order.tableLabel || order.addressText || order.orderNumber,
          });
        }
        for (const order of deliveryOrders) {
          useToastStore.getState().push({
            kind: "vendorIncoming",
            entityId: order.orderNumber,
          });
        }
        if (stripLocalePrefix(pathname).startsWith("/vendor/orders")) {
          router.refresh();
        }
      }

      seenIds.current = new Set(result.pending.map((order) => order.id));
      setPendingCount(result.pending.length);
    };

    void pull();
    const timer = window.setInterval(() => {
      void pull();
    }, POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [pathname, router, setPendingCount, storeId]);

  return null;
}
