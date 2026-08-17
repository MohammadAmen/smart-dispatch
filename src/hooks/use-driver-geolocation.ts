"use client";

import { useEffect, useRef } from "react";

import { patchDriver } from "@/lib/driver/client";
import { calculateDistance } from "@/lib/geo";
import type { LatLngTuple } from "@/lib/live-map";
import { useDriverStore } from "@/stores/driver-store";

const WATCH_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 8_000,
  timeout: 20_000,
};

const MIN_MOVE_KM = 0.04;
const MIN_SYNC_MS = 12_000;

export function useDriverGeolocation(): void {
  const driverId = useDriverStore((state) => state.driverId);
  const dutyStatus = useDriverStore((state) => state.dutyStatus);
  const lastSent = useRef<{ point: LatLngTuple; at: number } | null>(null);
  const wakeLock = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!driverId || dutyStatus === "OFFLINE") {
      return;
    }

    if (!("geolocation" in navigator)) {
      useDriverStore.getState().setLocationError("unsupported");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const point: LatLngTuple = [
          position.coords.latitude,
          position.coords.longitude,
        ];
        useDriverStore.getState().setLocation(point);

        const previous = lastSent.current;
        const movedKm = previous
          ? calculateDistance(
              previous.point[0],
              previous.point[1],
              point[0],
              point[1],
            )
          : Number.POSITIVE_INFINITY;
        const elapsed = previous ? Date.now() - previous.at : MIN_SYNC_MS;

        if (
          navigator.onLine &&
          (movedKm >= MIN_MOVE_KM || elapsed >= MIN_SYNC_MS)
        ) {
          lastSent.current = { point, at: Date.now() };
          void patchDriver({
            driverId,
            latitude: point[0],
            longitude: point[1],
          });
        }
      },
      () => {
        useDriverStore.getState().setLocationError("denied");
      },
      WATCH_OPTIONS,
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [driverId, dutyStatus]);

  useEffect(() => {
    if (dutyStatus !== "AVAILABLE" || !("wakeLock" in navigator)) {
      return;
    }

    let cancelled = false;

    const requestLock = async (): Promise<void> => {
      try {
        const sentinel = await navigator.wakeLock.request("screen");
        if (cancelled) {
          await sentinel.release();
          return;
        }
        wakeLock.current = sentinel;
      } catch {
        wakeLock.current = null;
      }
    };

    void requestLock();

    const onVisibility = (): void => {
      if (document.visibilityState === "visible") {
        void requestLock();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      void wakeLock.current?.release();
      wakeLock.current = null;
    };
  }, [dutyStatus]);
}
