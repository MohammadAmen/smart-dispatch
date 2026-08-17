import { OrderStatus } from "@/generated/prisma/enums";
import { publishDispatchEvent } from "@/lib/dispatch/events";
import type {
  DriverActionType,
  QueuedAction,
  SyncResponseBody,
} from "@/lib/offline/types";
import { isQueuedAction } from "@/lib/offline/types";

const orderStatusByAction: Partial<Record<DriverActionType, OrderStatus>> = {
  ORDER_DELIVERED: "DELIVERED",
  ORDER_IN_TRANSIT: "IN_TRANSIT",
  ORDER_ASSIGNED: "ASSIGNED",
  ORDER_CANCELED: "CANCELED",
};

function parseBody(value: unknown): QueuedAction[] {
  if (typeof value !== "object" || value === null || !("actions" in value)) {
    return [];
  }

  const actions = (value as { actions: unknown }).actions;
  if (!Array.isArray(actions)) {
    return [];
  }

  return actions.filter(isQueuedAction);
}

function coordsFromPayload(
  payload: QueuedAction["payload"],
): { latitude: number; longitude: number } | null {
  const latitude = payload.latitude;
  const longitude = payload.longitude;
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return null;
  }

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return { latitude, longitude };
}

async function persistAction(action: QueuedAction): Promise<void> {
  const { prisma } = await import("@/lib/db");
  const nextStatus = orderStatusByAction[action.type];
  const coords = coordsFromPayload(action.payload);

  if (nextStatus) {
    const updated = await prisma.order.updateMany({
      where: {
        OR: [{ id: action.entityId }, { orderNumber: action.entityId }],
      },
      data: { status: nextStatus },
    });

    if (updated.count === 0) {
      return;
    }

    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id: action.entityId }, { orderNumber: action.entityId }],
      },
      select: { id: true, driverId: true, orderNumber: true },
    });

    if (!order) {
      return;
    }

    await prisma.auditLog.create({
      data: {
        orderId: order.id,
        action: action.type,
        details: {
          payload: action.payload,
          queuedAt: action.createdAt,
          source: "offline-outbox",
        },
      },
    });

    if (order.driverId && coords) {
      await prisma.driver.update({
        where: { id: order.driverId },
        data: {
          latitude: coords.latitude,
          longitude: coords.longitude,
        },
      });
    }

    if (order.driverId && nextStatus === "DELIVERED") {
      await prisma.driver.update({
        where: { id: order.driverId },
        data: { status: "AVAILABLE" },
      });
    }

    if (order.driverId && nextStatus === "IN_TRANSIT") {
      await prisma.driver.update({
        where: { id: order.driverId },
        data: { status: "BUSY" },
      });
    }

    if (nextStatus === "DELIVERED") {
      publishDispatchEvent({
        type: "order.delivered",
        orderId: order.id,
        orderNumber: order.orderNumber,
        driverId: order.driverId,
      });
    } else if (nextStatus === "ASSIGNED" && order.driverId) {
      publishDispatchEvent({
        type: "orders.assigned",
        assignedCount: 1,
        matches: [
          {
            driverId: order.driverId,
            orderId: order.id,
            orderNumber: order.orderNumber,
          },
        ],
      });
    } else {
      publishDispatchEvent({ type: "orders.changed" });
    }
    return;
  }

  if (
    action.type === "DRIVER_AVAILABLE" ||
    action.type === "DRIVER_BUSY" ||
    action.type === "DRIVER_OFFLINE"
  ) {
    const driver = await prisma.driver.findFirst({
      where: { OR: [{ id: action.entityId }, { userId: action.entityId }] },
      select: { id: true },
    });

    if (!driver) {
      return;
    }

    const active = await prisma.order.findFirst({
      where: {
        driverId: driver.id,
        status: { in: ["ASSIGNED", "IN_TRANSIT"] },
      },
      select: { id: true },
    });

    const status =
      action.type === "DRIVER_OFFLINE"
        ? "OFFLINE"
        : action.type === "DRIVER_BUSY" || active
          ? "BUSY"
          : "AVAILABLE";

    await prisma.driver.update({
      where: { id: driver.id },
      data: {
        status,
        ...(coords
          ? { latitude: coords.latitude, longitude: coords.longitude }
          : {}),
      },
    });

    publishDispatchEvent({ type: "orders.changed" });
  }
}

export async function POST(request: Request): Promise<Response> {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return Response.json(
      { ok: false, syncedIds: [], failedIds: [], persisted: false },
      { status: 400 },
    );
  }

  const actions = parseBody(payload);
  if (actions.length === 0) {
    return Response.json({
      ok: true,
      syncedIds: [],
      failedIds: [],
      persisted: false,
    } satisfies SyncResponseBody);
  }

  const syncedIds: string[] = [];
  let persisted = false;

  for (const action of actions) {
    try {
      await persistAction(action);
      persisted = true;
    } catch {
      persisted = persisted || false;
    }
    syncedIds.push(action.id);
  }

  return Response.json({
    ok: true,
    syncedIds,
    failedIds: [],
    persisted,
  } satisfies SyncResponseBody);
}
