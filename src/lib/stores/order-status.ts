import type { OrderStatus } from "@/generated/prisma/enums";

export const VENDOR_ORDER_FILTERS = [
  "ALL",
  "PENDING_QUOTE",
  "PENDING",
  "PREPARING",
  "READY_FOR_PICKUP",
  "DELIVERED",
] as const;

export type VendorOrderFilter = (typeof VENDOR_ORDER_FILTERS)[number];

export const TRACKING_STEPS = [
  "PENDING",
  "PREPARING",
  "READY_FOR_PICKUP",
  "IN_TRANSIT",
  "DELIVERED",
] as const;

export type TrackingStep = (typeof TRACKING_STEPS)[number];

export function vendorNextStatus(status: OrderStatus): "PREPARING" | "READY_FOR_PICKUP" | null {
  if (status === "PENDING") {
    return "PREPARING";
  }

  if (status === "PREPARING") {
    return "READY_FOR_PICKUP";
  }

  return null;
}

export function vendorNextActionKey(status: OrderStatus): string | null {
  if (status === "PENDING") {
    return "vendor.markPreparing";
  }

  if (status === "PREPARING") {
    return "vendor.markReady";
  }

  return null;
}

export function trackingStepIndex(status: OrderStatus): number {
  if (status === "PENDING_QUOTE" || status === "QUOTE_ACCEPTED" || status === "PENDING") {
    return 0;
  }

  if (status === "PREPARING") {
    return 1;
  }

  if (status === "READY_FOR_PICKUP" || status === "ASSIGNED") {
    return 2;
  }

  if (status === "IN_TRANSIT") {
    return 3;
  }

  if (status === "DELIVERED") {
    return 4;
  }

  return 0;
}

export function isOnTheWayStatus(status: OrderStatus): boolean {
  return status === "READY_FOR_PICKUP" || status === "IN_TRANSIT";
}

export function isDispatchAssignable(
  status: OrderStatus,
  storeId?: string | null,
): boolean {
  if (status === "PENDING_QUOTE" || status === "QUOTE_ACCEPTED") {
    return false;
  }

  if (status === "READY_FOR_PICKUP") {
    return true;
  }

  return status === "PENDING" && !storeId;
}

export function vendorCanCancel(status: OrderStatus): boolean {
  return (
    status === "PENDING_QUOTE" ||
    status === "QUOTE_ACCEPTED" ||
    status === "PENDING" ||
    status === "PREPARING" ||
    status === "READY_FOR_PICKUP"
  );
}
