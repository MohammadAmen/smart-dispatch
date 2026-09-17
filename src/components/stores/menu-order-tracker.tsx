"use client";

import type { ReactNode } from "react";

import { OrderTrackerApp } from "@/components/menu/order-tracker-app";

export function MenuOrderTracker({
  initialToken,
}: {
  initialToken: string;
}): ReactNode {
  return <OrderTrackerApp initialToken={initialToken} />;
}
