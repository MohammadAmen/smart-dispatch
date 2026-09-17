import "server-only";

import { prisma } from "@/lib/db";
import { publishDispatchEvent } from "@/lib/dispatch/events";
import { notifyCustomerOrderUpdate } from "@/lib/stores/order-notify";
import { pgAddColumn } from "@/lib/stores/sql-schema";
import { ensureOrderTrackingToken } from "@/lib/stores/order-token";

let bundleReady: Promise<void> | null = null;

async function migrateOrderBundleSchema(): Promise<void> {
  await pgAddColumn("orders", "parentOrderId", "VARCHAR(191) NULL");
  await pgAddColumn("orders", "bundleRole", "VARCHAR(191) NOT NULL DEFAULT 'SINGLE'");
  await pgAddColumn("orders", "deliveryFee", "DOUBLE PRECISION NOT NULL DEFAULT 0");
  await pgAddColumn("orders", "storeNotes", "VARCHAR(500) NULL");
  await pgAddColumn("orders", "declinedDriverIds", "TEXT NULL");
  await pgAddColumn("orders", "offeredAt", "TIMESTAMP(3) NULL");
  await pgAddColumn("orders", "driverAcceptedAt", "TIMESTAMP(3) NULL");
}

export async function ensureOrderBundleSchema(): Promise<void> {
  if (!bundleReady) {
    bundleReady = migrateOrderBundleSchema().catch((error: unknown) => {
      bundleReady = null;
      throw error;
    });
  }
  await bundleReady;
}

const READY_OR_BEYOND = new Set([
  "READY_FOR_PICKUP",
  "ASSIGNED",
  "IN_TRANSIT",
  "DELIVERED",
]);

export async function refreshParentBundleStatus(childOrderId: string): Promise<void> {
  await ensureOrderBundleSchema();
  const child = await prisma.order.findUnique({
    where: { id: childOrderId },
    select: { parentOrderId: true },
  });
  if (!child?.parentOrderId) {
    return;
  }

  const siblings = await prisma.order.findMany({
    where: { parentOrderId: child.parentOrderId },
    select: { status: true },
  });
  const parent = await prisma.order.findUnique({
    where: { id: child.parentOrderId },
    select: { id: true, status: true, orderNumber: true, customerPhone: true, trackingToken: true },
  });
  if (!parent) {
    return;
  }

  const active = siblings.filter((row) => row.status !== "CANCELED");
  if (active.length === 0) {
    if (parent.status !== "CANCELED" && parent.status !== "DELIVERED") {
      await prisma.order.update({
        where: { id: parent.id },
        data: { status: "CANCELED" },
      });
      const trackingToken = parent.trackingToken ?? (await ensureOrderTrackingToken(parent.id));
      void notifyCustomerOrderUpdate({
        phone: parent.customerPhone,
        orderNumber: parent.orderNumber,
        trackingToken,
        kind: "canceled",
      }).catch(() => undefined);
      publishDispatchEvent({ type: "orders.changed" });
    }
    return;
  }

  if (!active.every((row) => READY_OR_BEYOND.has(row.status))) {
    return;
  }

  if (parent.status !== "PENDING" && parent.status !== "PREPARING") {
    return;
  }

  await prisma.order.update({
    where: { id: parent.id },
    data: { status: "READY_FOR_PICKUP" },
  });
  publishDispatchEvent({ type: "orders.changed" });

  const trackingToken = parent.trackingToken ?? (await ensureOrderTrackingToken(parent.id));
  void notifyCustomerOrderUpdate({
    phone: parent.customerPhone,
    orderNumber: parent.orderNumber,
    trackingToken,
    kind: "ready",
  }).catch(() => undefined);
}
