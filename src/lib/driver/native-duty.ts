"use client";

import { Capacitor, registerPlugin } from "@capacitor/core";

interface DriverDutyPlugin {
  start(options: { driverId: string; origin: string; title: string; body: string }): Promise<void>;
  stop(): Promise<void>;
  prepareAlerts(): Promise<void>;
  dismissOffer(): Promise<void>;
}

const DriverDuty = registerPlugin<DriverDutyPlugin>("DriverDuty");

export async function syncNativeDuty(
  input: { driverId: string; title: string; body: string } | null,
): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    if (!input) {
      await DriverDuty.stop();
      return;
    }
    await DriverDuty.prepareAlerts();
    await DriverDuty.start({
      driverId: input.driverId,
      origin: window.location.origin,
      title: input.title,
      body: input.body,
    });
  } catch {
    // The web session still receives offers while this WebView is open.
  }
}

export async function dismissNativeOffer(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }
  try {
    await DriverDuty.dismissOffer();
  } catch {
    // The in-app ringtone still stops on accept or reject.
  }
}
