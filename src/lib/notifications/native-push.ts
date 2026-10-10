import { Capacitor } from "@capacitor/core";

import {
  CUSTOMER_CHANNEL_ID,
  DRIVER_CHANNEL_ID,
  DRIVER_SOUND,
} from "@/lib/notifications/channels";

const UNREAD_KEY = "beev-push-unread";
const DRIVER_PATHS = new Set(["/ar/driver", "/en/driver"]);

let cachedToken: string | null = null;
let pushStart: Promise<void> | null = null;

function driverPath(value: unknown): string | null {
  return typeof value === "string" && DRIVER_PATHS.has(value) ? value : null;
}

function offerData(data: Record<string, unknown> | undefined): { path: string } | null {
  if (!data || data.kind !== "driver-offer") {
    return null;
  }
  const path = driverPath(data.path);
  return path ? { path } : null;
}

function deliverDriverOffer(path: string): void {
  if (window.location.pathname === path || window.location.pathname.endsWith("/driver")) {
    window.dispatchEvent(new CustomEvent("beev-driver-offer"));
    return;
  }
  window.location.assign(path);
}

function readUnread(): number {
  const value = Number(localStorage.getItem(UNREAD_KEY) ?? "0");
  return Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
}

function writeUnread(count: number): void {
  localStorage.setItem(UNREAD_KEY, String(Math.max(0, count)));
}

async function setBadge(count: number): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }
  const { Badge } = await import("@capawesome/capacitor-badge");
  if (count <= 0) {
    await Badge.clear();
    return;
  }
  await Badge.set({ count });
}

export async function clearAppBadge(): Promise<void> {
  writeUnread(0);
  await setBadge(0);
}

async function bumpBadge(): Promise<void> {
  const next = readUnread() + 1;
  writeUnread(next);
  await setBadge(next);
}

async function saveToken(token: string): Promise<void> {
  cachedToken = token;
  const session = await fetch("/api/auth/session", { cache: "no-store" });
  if (!session.ok) {
    return;
  }
  const body = (await session.json()) as { user?: { role?: string } };
  const audience = body.user?.role === "DRIVER" ? "driver" : "customer";
  await fetch("/api/notifications/save-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, audience }),
  });
}

export async function resaveNativePushToken(): Promise<void> {
  if (!cachedToken || !Capacitor.isNativePlatform()) {
    return;
  }
  await saveToken(cachedToken);
}

export async function startNativePush(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }
  if (!pushStart) {
    pushStart = startNativePushInner().catch((error: unknown) => {
      pushStart = null;
      throw error;
    });
  }
  await pushStart;
}

async function startNativePushInner(): Promise<void> {

  const { PushNotifications } = await import("@capacitor/push-notifications");
  let permission = await PushNotifications.checkPermissions();
  if (permission.receive === "prompt" || permission.receive === "prompt-with-rationale") {
    permission = await PushNotifications.requestPermissions();
  }
  if (permission.receive !== "granted") {
    return;
  }

  if (Capacitor.getPlatform() === "android") {
    await PushNotifications.createChannel({
      id: CUSTOMER_CHANNEL_ID,
      name: "BEEV customers",
      description: "Order updates",
      importance: 3,
      visibility: 1,
      vibration: false,
    });
    await PushNotifications.createChannel({
      id: DRIVER_CHANNEL_ID,
      name: "BEEV delivery",
      description: "New delivery jobs",
      importance: 5,
      visibility: 1,
      sound: DRIVER_SOUND,
      vibration: true,
    });
  }

  await PushNotifications.register();
  await PushNotifications.addListener("registration", (event) => {
    void saveToken(event.value);
  });
  await PushNotifications.addListener("pushNotificationReceived", (event) => {
    void bumpBadge();
    const offer = offerData(event.data as Record<string, unknown> | undefined);
    if (offer) {
      deliverDriverOffer(offer.path);
    }
  });
  await PushNotifications.addListener("pushNotificationActionPerformed", (event) => {
    const offer = offerData(event.notification.data as Record<string, unknown> | undefined);
    if (offer) {
      deliverDriverOffer(offer.path);
      return;
    }
    window.location.assign("/notifications");
  });
}
