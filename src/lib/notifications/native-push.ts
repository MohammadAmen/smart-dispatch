import { Capacitor } from "@capacitor/core";

import {
  CUSTOMER_CHANNEL_ID,
  DRIVER_CHANNEL_ID,
  DRIVER_SOUND,
} from "@/lib/notifications/channels";

const UNREAD_KEY = "beev-push-unread";

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

export async function startNativePush(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

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
      importance: 4,
      visibility: 1,
      sound: DRIVER_SOUND,
      vibration: true,
    });
  }

  await PushNotifications.register();
  await PushNotifications.addListener("registration", (event) => {
    void saveToken(event.value);
  });
  await PushNotifications.addListener("pushNotificationReceived", () => {
    void bumpBadge();
  });
  await PushNotifications.addListener("pushNotificationActionPerformed", () => {
    window.location.assign("/notifications");
  });
}
