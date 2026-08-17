"use client";

import { OUTBOX_SYNC_TAG } from "@/lib/offline/constants";

interface SyncManagerLike {
  register: (tag: string) => Promise<void>;
}

export async function registerOutboxSync(): Promise<void> {
  if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration("/");
    if (!registration) {
      return;
    }
    const sync = (registration as ServiceWorkerRegistration & {
      sync?: SyncManagerLike;
    }).sync;

    if (sync) {
      await sync.register(OUTBOX_SYNC_TAG);
    }
  } catch {
    // Background Sync is optional; the page still flushes on `online`.
  }
}
