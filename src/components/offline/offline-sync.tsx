"use client";

import { useEffect } from "react";

import {
  SW_MESSAGE_FLUSHED,
  SW_MESSAGE_PLEASE_FLUSH,
} from "@/lib/offline/constants";
import { registerOfflineWorker } from "@/lib/offline/register-sw";
import { useOpsStore } from "@/stores/ops-store";
import { useSyncStore } from "@/stores/sync-store";
import { useToastStore } from "@/stores/toast-store";

export function OfflineSync(): null {
  const hydrate = useSyncStore((state) => state.hydrate);
  const flush = useSyncStore((state) => state.flush);
  const setConnectionStatus = useOpsStore((state) => state.setConnectionStatus);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      await hydrate();
      if (!cancelled && navigator.onLine) {
        await flush(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [flush, hydrate]);

  useEffect(() => {
    void registerOfflineWorker();
  }, []);

  useEffect(() => {
    const onOffline = (): void => {
      setConnectionStatus("offline");
      useToastStore.getState().push({ kind: "offline" });
    };

    const onOnline = (): void => {
      void flush(true);
    };

    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);

    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, [flush, setConnectionStatus]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    const onMessage = (event: MessageEvent<unknown>): void => {
      if (typeof event.data !== "object" || event.data === null) {
        return;
      }

      const data = event.data as { type?: string; count?: number };

      if (data.type === SW_MESSAGE_PLEASE_FLUSH) {
        void flush(true);
        return;
      }

      if (data.type === SW_MESSAGE_FLUSHED) {
        void hydrate();
        if (typeof data.count === "number" && data.count > 0) {
          useToastStore.getState().push({ kind: "synced", count: data.count });
        }
      }
    };

    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => {
      navigator.serviceWorker.removeEventListener("message", onMessage);
    };
  }, [flush, hydrate]);

  return null;
}
