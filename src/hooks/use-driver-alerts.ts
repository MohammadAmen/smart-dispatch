"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { playAssignedSound, unlockAudio } from "@/lib/audio";
import { subscribeDispatchStream } from "@/lib/dispatch/client";
import {
  notificationPermission,
  requestNotificationPermission,
  showBrowserNotification,
  vibrateAssigned,
  type BrowserNotificationPermission,
} from "@/lib/notify";
import { useDriverStore } from "@/stores/driver-store";

export function useDriverAlerts(): {
  permission: BrowserNotificationPermission;
  requestPermission: () => Promise<void>;
} {
  const { t } = useLocale();
  const driverId = useDriverStore((state) => state.driverId);
  const assignment = useDriverStore((state) => state.assignment);
  const hydrate = useDriverStore((state) => state.hydrate);
  const primedOrderRef = useRef<string | null>(null);
  const primedRef = useRef(false);
  const [permission, setPermission] =
    useState<BrowserNotificationPermission>("unsupported");

  useEffect(() => {
    setPermission(notificationPermission());
  }, []);

  useEffect(() => {
    if (!assignment) {
      return;
    }

    if (!primedRef.current) {
      primedOrderRef.current = assignment.orderNumber;
      primedRef.current = true;
      return;
    }

    if (primedOrderRef.current === assignment.orderNumber) {
      return;
    }

    primedOrderRef.current = assignment.orderNumber;
    playAssignedSound();
    vibrateAssigned();
    showBrowserNotification({
      title: t("driver.alertTitle", { orderNumber: assignment.orderNumber }),
      body: t("driver.alertBody", { address: assignment.addressText }),
      tag: `sd-assign-${assignment.orderNumber}`,
    });
  }, [assignment, t]);

  useEffect(() => {
    if (!driverId) {
      primedRef.current = false;
      primedOrderRef.current = null;
    }
  }, [driverId]);

  useEffect(() => {
    if (!driverId) {
      return;
    }

    const unsubscribe = subscribeDispatchStream((event) => {
      if (event.type === "connected") {
        return;
      }

      if (event.type === "orders.assigned") {
        const mine = event.matches.some((match) => match.driverId === driverId);
        if (mine) {
          void hydrate();
        }
        return;
      }

      if (event.type === "orders.changed" || event.type === "order.delivered") {
        void hydrate();
      }
    });

    return unsubscribe;
  }, [driverId, hydrate]);

  const requestPermission = useCallback(async (): Promise<void> => {
    await unlockAudio();
    const next = await requestNotificationPermission();
    setPermission(next);
  }, []);

  return { permission, requestPermission };
}
