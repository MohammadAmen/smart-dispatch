"use client";

import { SW_DEV_CLEARED_KEY, SW_PATH } from "@/lib/offline/constants";

async function unregisterDevWorkers(): Promise<void> {
  const registrations = await navigator.serviceWorker.getRegistrations();
  const cacheNames = await caches.keys();

  await Promise.all([
    ...registrations.map((registration) => registration.unregister()),
    ...cacheNames.map((name) => caches.delete(name)),
  ]);

  const stillControlling = Boolean(navigator.serviceWorker.controller);
  if (
    (registrations.length > 0 || stillControlling) &&
    sessionStorage.getItem(SW_DEV_CLEARED_KEY) !== "1"
  ) {
    sessionStorage.setItem(SW_DEV_CLEARED_KEY, "1");
    window.location.reload();
  }
}

export async function registerOfflineWorker(): Promise<void> {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  if (process.env.NODE_ENV !== "production") {
    await unregisterDevWorkers();
    return;
  }

  await navigator.serviceWorker.register(SW_PATH, {
    scope: "/",
    updateViaCache: "none",
  });
}
