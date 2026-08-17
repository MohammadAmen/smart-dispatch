import "server-only";

import { prisma } from "@/lib/db";
import { bootstrapDispatchData } from "@/lib/dispatch/bootstrap";
import { publishDispatchEvent } from "@/lib/dispatch/events";
import { orderWithDriver } from "@/lib/dispatch/order-mapper";
import type {
  AssignmentMatch,
  AutoAssignResult,
  UnmatchedOrder,
} from "@/lib/dispatch/types";
import { calculateDistance, roundDistanceKm } from "@/lib/geo";

interface AutoAssignOptions {
  orderId?: string;
}

interface CandidateDriver {
  id: string;
  vehicleType: string;
  latitude: number;
  longitude: number;
  user: { name: string };
}

function orderAnchor(order: {
  pickupLat: number | null;
  pickupLng: number | null;
  deliveryLat: number;
  deliveryLng: number;
}): { lat: number; lng: number } | null {
  if (order.pickupLat != null && order.pickupLng != null) {
    return { lat: order.pickupLat, lng: order.pickupLng };
  }

  return { lat: order.deliveryLat, lng: order.deliveryLng };
}

function nearestDriver(
  anchor: { lat: number; lng: number },
  drivers: CandidateDriver[],
): { driver: CandidateDriver; distanceKm: number } | null {
  let best: { driver: CandidateDriver; distanceKm: number } | null = null;

  for (const driver of drivers) {
    const distanceKm = calculateDistance(
      driver.latitude,
      driver.longitude,
      anchor.lat,
      anchor.lng,
    );

    if (!Number.isFinite(distanceKm)) {
      continue;
    }

    if (!best || distanceKm < best.distanceKm) {
      best = { driver, distanceKm };
    }
  }

  return best;
}

async function loadAvailableDrivers(): Promise<CandidateDriver[]> {
  const rows = await prisma.driver.findMany({
    where: {
      status: "AVAILABLE",
      latitude: { not: null },
      longitude: { not: null },
    },
    select: {
      id: true,
      vehicleType: true,
      latitude: true,
      longitude: true,
      user: { select: { name: true } },
    },
  });

  return rows.flatMap((row) => {
    if (row.latitude == null || row.longitude == null) {
      return [];
    }

    return [
      {
        id: row.id,
        vehicleType: row.vehicleType,
        latitude: row.latitude,
        longitude: row.longitude,
        user: row.user,
      },
    ];
  });
}

async function assignPair(
  orderId: string,
  driverId: string,
  distanceKm: number,
): Promise<"assigned" | "order_gone" | "driver_gone"> {
  try {
    return await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: orderId, status: "PENDING" },
        select: { id: true },
      });

      if (!order) {
        return "order_gone";
      }

      const driver = await tx.driver.findFirst({
        where: { id: driverId, status: "AVAILABLE" },
        select: { id: true },
      });

      if (!driver) {
        return "driver_gone";
      }

      await tx.order.update({
        where: { id: orderId },
        data: {
          status: "ASSIGNED",
          driverId,
        },
      });

      await tx.driver.update({
        where: { id: driverId },
        data: { status: "BUSY" },
      });

      await tx.auditLog.create({
        data: {
          orderId,
          action: "DRIVER_ASSIGNED",
          details: {
            driverId,
            distanceKm,
            source: "auto-dispatch",
          },
        },
      });

      return "assigned";
    });
  } catch {
    return "driver_gone";
  }
}

export async function runAutoAssign(
  options: AutoAssignOptions = {},
): Promise<AutoAssignResult> {
  await bootstrapDispatchData();

  const pending = await prisma.order.findMany({
    where: options.orderId
      ? {
          status: "PENDING",
          OR: [{ id: options.orderId }, { orderNumber: options.orderId }],
        }
      : { status: "PENDING" },
    include: orderWithDriver,
    orderBy: { createdAt: "asc" },
  });

  const remainingDrivers = await loadAvailableDrivers();
  const matches: AssignmentMatch[] = [];
  const unmatched: UnmatchedOrder[] = [];

  for (const order of pending) {
    const anchor = orderAnchor(order);
    if (!anchor) {
      unmatched.push({
        orderId: order.id,
        orderNumber: order.orderNumber,
        reason: "MISSING_COORDINATES",
      });
      continue;
    }

    let assigned = false;

    while (remainingDrivers.length > 0) {
      const nearest = nearestDriver(anchor, remainingDrivers);
      if (!nearest) {
        break;
      }

      const outcome = await assignPair(
        order.id,
        nearest.driver.id,
        roundDistanceKm(nearest.distanceKm),
      );

      if (outcome === "driver_gone") {
        const driverIndex = remainingDrivers.findIndex(
          (driver) => driver.id === nearest.driver.id,
        );
        if (driverIndex >= 0) {
          remainingDrivers.splice(driverIndex, 1);
        }
        continue;
      }

      if (outcome === "order_gone") {
        assigned = true;
        break;
      }

      const driverIndex = remainingDrivers.findIndex(
        (driver) => driver.id === nearest.driver.id,
      );
      if (driverIndex >= 0) {
        remainingDrivers.splice(driverIndex, 1);
      }

      matches.push({
        orderId: order.id,
        orderNumber: order.orderNumber,
        driverId: nearest.driver.id,
        driverName: nearest.driver.user.name,
        vehicleType: nearest.driver.vehicleType,
        distanceKm: roundDistanceKm(nearest.distanceKm),
      });
      assigned = true;
      break;
    }

    if (!assigned) {
      unmatched.push({
        orderId: order.id,
        orderNumber: order.orderNumber,
        reason: remainingDrivers.length === 0 ? "NO_AVAILABLE_DRIVERS" : "CONCURRENT_UPDATE",
      });
    }
  }

  const [pendingRemaining, availableDriversRemaining] = await Promise.all([
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.driver.count({
      where: {
        status: "AVAILABLE",
        latitude: { not: null },
        longitude: { not: null },
      },
    }),
  ]);

  if (matches.length > 0) {
    publishDispatchEvent({
      type: "orders.assigned",
      assignedCount: matches.length,
      matches: matches.map((match) => ({
        driverId: match.driverId,
        orderId: match.orderId,
        orderNumber: match.orderNumber,
      })),
    });
  }

  return {
    ok: true,
    assignedCount: matches.length,
    unmatchedCount: unmatched.length,
    pendingRemaining,
    availableDriversRemaining,
    matches,
    unmatched,
  };
}
