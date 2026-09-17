import "server-only";

import { prisma } from "@/lib/db";
import { publishDispatchEvent } from "@/lib/dispatch/events";
import { notifyCustomerOrderUpdate } from "@/lib/stores/order-notify";
import { ensureOrderTrackingToken } from "@/lib/stores/order-token";

let bundleReady: Promise<void> | null = null;

async function columnExists(column: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ count: bigint | number }[]>`
    SELECT COUNT(*) AS count
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = "orders"
      AND COLUMN_NAME = ${column}
  `;
  return Number(rows[0]?.count ?? 0) > 0;
}

async function addColumn(ddl: string, column: string): Promise<void> {
  if (await columnExists(column)) {
    return;
  }
  await prisma.$executeRawUnsafe(`ALTER TABLE \`orders\` ADD COLUMN ${ddl}`);
}

async function migrateOrderBundleSchema(): Promise<void> {
  await addColumn("`parentOrderId` VARCHAR(191) NULL", "parentOrderId");
  await addColumn("`bundleRole` VARCHAR(191) NOT NULL DEFAULT 'SINGLE'", "bundleRole");
  await addColumn("`deliveryFee` DOUBLE NOT NULL DEFAULT 0", "deliveryFee");
  await addColumn("`storeNotes` VARCHAR(500) NULL", "storeNotes");
  await addColumn("`declinedDriverIds` TEXT NULL", "declinedDriverIds");
  await addColumn("`offeredAt` DATETIME(3) NULL", "offeredAt");
  await addColumn("`driverAcceptedAt` DATETIME(3) NULL", "driverAcceptedAt");
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
