"use client";

export type BrowserNotificationPermission = NotificationPermission | "unsupported";

export function notificationPermission(): BrowserNotificationPermission {
  if (typeof window === "undefined" || typeof Notification === "undefined") {
    return "unsupported";
  }

  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<BrowserNotificationPermission> {
  if (typeof window === "undefined" || typeof Notification === "undefined") {
    return "unsupported";
  }

  if (Notification.permission !== "default") {
    return Notification.permission;
  }

  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export function showBrowserNotification(input: {
  title: string;
  body: string;
  tag: string;
}): void {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") {
    return;
  }

  try {
    const notification = new Notification(input.title, {
      body: input.body,
      tag: input.tag,
      lang: document.documentElement.lang,
      icon: "/favicon.ico",
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch {
    // Some embedded WebViews reject Notification construction.
  }
}

export function vibrateAssigned(): void {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") {
    return;
  }

  navigator.vibrate([200, 100, 200]);
}

let incomingVibrateTimer: number | null = null;

export function startIncomingVibrate(): void {
  stopIncomingVibrate();
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") {
    return;
  }

  navigator.vibrate([500, 120, 500, 120, 500, 180, 800, 700]);
  incomingVibrateTimer = window.setInterval(() => {
    navigator.vibrate([500, 120, 500, 120, 500, 180, 800, 700]);
  }, 2500);
}

export function stopIncomingVibrate(): void {
  if (incomingVibrateTimer != null) {
    window.clearInterval(incomingVibrateTimer);
    incomingVibrateTimer = null;
  }

  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate(0);
  }
}
