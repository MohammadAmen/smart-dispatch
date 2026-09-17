import "server-only";

import { prisma } from "@/lib/db";
import { runAutoAssign } from "@/lib/dispatch/auto-assign";
import { publishDispatchEvent } from "@/lib/dispatch/events";
import { parseDeclinedDriverIds, stringifyDeclinedDriverIds } from "@/lib/driver/declined";
import { DRIVER_OFFER_STALE_MS } from "@/lib/driver/offer-window";
import { ensureOrderBundleSchema } from "@/lib/stores/order-bundle";

export { DRIVER_OFFER_SECONDS, DRIVER_OFFER_STALE_MS } from "@/lib/driver/offer-window";

export type DriverOfferAction = "accept" | "reject" | "timeout";

export { parseDeclinedDriverIds, stringifyDeclinedDriverIds } from "@/lib/driver/declined";

function restoreAssignableStatus(storeId: string | null): "PENDING" | "READY_FOR_PICKUP" {
  return storeId ? "READY_FOR_PICKUP" : "PENDING";
}

async function releaseOrderFromDriver(
  orderId: string,
  driverId: string,
  reason: "reject" | "timeout",
): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: {
        id: orderId,
        driverId,
        status: "ASSIGNED",
        driverAcceptedAt: null,
      },
      select: {
        id: true,
        bundleRole: true,
        storeId: true,
        declinedDriverIds: true,
      },
    });

    if (!order) {
      return false;
    }

    const declined = parseDeclinedDriverIds(order.declinedDriverIds);
    declined.push(driverId);
    const nextStatus = restoreAssignableStatus(order.storeId);

    await tx.order.update({
      where: { id: order.id },
      data: {
        status: nextStatus,
        driverId: null,
        offeredAt: null,
        driverAcceptedAt: null,
        declinedDriverIds: stringifyDeclinedDriverIds(declined),
      },
    });

    if (order.bundleRole === "PARENT") {
      await tx.order.updateMany({
        where: { parentOrderId: order.id, status: { not: "CANCELED" } },
        data: {
          status: nextStatus,
          driverId: null,
          offeredAt: null,
          driverAcceptedAt: null,
        },
      });
    }

    await tx.driver.update({
      where: { id: driverId },
      data: { status: reason === "timeout" ? "OFFLINE" : "AVAILABLE" },
    });

    await tx.auditLog.create({
      data: {
        orderId: order.id,
        action: reason === "timeout" ? "DRIVER_OFFER_TIMEOUT" : "DRIVER_OFFER_REJECTED",
        details: { driverId, reason },
      },
    });

    return true;
  });
}

export async function acceptDriverOffer(orderId: string, driverId: string): Promise<boolean> {
  await ensureOrderBundleSchema();
  const accepted = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: {
        id: orderId,
        driverId,
        status: "ASSIGNED",
      },
      select: { id: true },
    });

    if (!order) {
      return false;
    }

    await tx.order.update({
      where: { id: order.id },
      data: { driverAcceptedAt: new Date() },
    });

    await tx.driver.update({
      where: { id: driverId },
      data: { status: "BUSY" },
    });

    await tx.auditLog.create({
      data: {
        orderId: order.id,
        action: "DRIVER_OFFER_ACCEPTED",
        details: { driverId },
      },
    });

    return true;
  });

  if (accepted) {
    publishDispatchEvent({ type: "orders.changed" });
  }

  return accepted;
}

export async function declineDriverOffer(
  orderId: string,
  driverId: string,
  reason: "reject" | "timeout",
): Promise<boolean> {
  await ensureOrderBundleSchema();
  const released = await releaseOrderFromDriver(orderId, driverId, reason);
  if (!released) {
    return false;
  }

  const result = await runAutoAssign({ orderId });
  if (result.assignedCount === 0) {
    publishDispatchEvent({ type: "orders.changed" });
  }

  return true;
}

export async function expireStaleDriverOffer(driverId: string): Promise<void> {
  await ensureOrderBundleSchema();
  const stale = await prisma.order.findFirst({
    where: {
      driverId,
      status: "ASSIGNED",
      driverAcceptedAt: null,
      offeredAt: { lte: new Date(Date.now() - DRIVER_OFFER_STALE_MS) },
    },
    select: { id: true },
  });

  if (!stale) {
    return;
  }

  await declineDriverOffer(stale.id, driverId, "timeout");
}
