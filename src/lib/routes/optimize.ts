import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { bootstrapDispatchData } from "@/lib/dispatch/bootstrap";
import { publishDispatchEvent } from "@/lib/dispatch/events";
import { calculateDistance, roundDistanceKm } from "@/lib/geo";
import { zoneFromPoint } from "@/lib/fleet/zones";
import type { RouteOptimizeResult, RouteWaypoint, SerializedRoute } from "@/lib/routes/types";
import { parseWaypoints } from "@/lib/routes/types";

interface PendingOrder {
  id: string;
  orderNumber: string;
  deliveryLat: number;
  deliveryLng: number;
  createdAt: Date;
}

interface ActiveVehicle {
  id: string;
  capacityKg: number;
  currentLoadPct: number;
  zone: string;
  driver: {
    id: string;
    latitude: number;
    longitude: number;
    user: { name: string };
  };
}

interface RouteRow {
  id: string;
  status: SerializedRoute["status"];
  zone: string | null;
  totalDistanceKm: number;
  estimatedMinutes: number;
  waypoints: Prisma.JsonValue;
  createdAt: Date;
  deliveryZone: { name: string; code: string } | null;
  driver: {
    id: string;
    user: { name: string };
    vehicle: { plateNumber: string } | null;
  };
}

const routeInclude = {
  deliveryZone: { select: { name: true, code: true } },
  driver: {
    include: {
      user: { select: { name: true } },
      vehicle: { select: { plateNumber: true } },
    },
  },
} as const;

function serializeRoute(row: RouteRow): SerializedRoute {
  const waypoints = parseWaypoints(row.waypoints);
  return {
    id: row.id,
    status: row.status,
    zone: row.deliveryZone?.code ?? row.zone,
    zoneName: row.deliveryZone?.name ?? row.zone,
    totalDistanceKm: row.totalDistanceKm,
    estimatedMinutes: row.estimatedMinutes,
    stopCount: waypoints.filter((point) => point.kind === "stop").length,
    waypoints,
    createdAt: row.createdAt.toISOString(),
    driver: {
      id: row.driver.id,
      name: row.driver.user.name,
      plateNumber: row.driver.vehicle?.plateNumber ?? null,
    },
  };
}

function orderSlots(capacityKg: number, currentLoadPct: number): number {
  const remainingPct = Math.max(0, 100 - currentLoadPct);
  const kgRemaining = (capacityKg * remainingPct) / 100;
  return Math.max(0, Math.floor(kgRemaining / 15));
}

function nearestNeighbor(
  start: { lat: number; lng: number },
  stops: PendingOrder[],
): { waypoints: RouteWaypoint[]; totalDistanceKm: number } {
  const remaining = [...stops];
  const waypoints: RouteWaypoint[] = [
    { lat: start.lat, lng: start.lng, kind: "start" },
  ];
  let cursor = start;
  let totalDistanceKm = 0;

  while (remaining.length > 0) {
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (let index = 0; index < remaining.length; index += 1) {
      const candidate = remaining[index];
      const distance = calculateDistance(
        cursor.lat,
        cursor.lng,
        candidate.deliveryLat,
        candidate.deliveryLng,
      );
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    }

    const next = remaining.splice(bestIndex, 1)[0];
    totalDistanceKm += Number.isFinite(bestDistance) ? bestDistance : 0;
    waypoints.push({
      lat: next.deliveryLat,
      lng: next.deliveryLng,
      kind: "stop",
      orderId: next.id,
      orderNumber: next.orderNumber,
    });
    cursor = { lat: next.deliveryLat, lng: next.deliveryLng };
  }

  return { waypoints, totalDistanceKm: roundDistanceKm(totalDistanceKm, 2) };
}

function pickVehicle(
  zone: string,
  orders: PendingOrder[],
  vehicles: ActiveVehicle[],
): ActiveVehicle | null {
  if (vehicles.length === 0 || orders.length === 0) {
    return null;
  }

  const first = orders[0];
  const ranked = [...vehicles].sort((left, right) => {
    const leftZone = left.zone === zone ? 0 : 1;
    const rightZone = right.zone === zone ? 0 : 1;
    if (leftZone !== rightZone) {
      return leftZone - rightZone;
    }

    const leftDistance = calculateDistance(
      left.driver.latitude,
      left.driver.longitude,
      first.deliveryLat,
      first.deliveryLng,
    );
    const rightDistance = calculateDistance(
      right.driver.latitude,
      right.driver.longitude,
      first.deliveryLat,
      first.deliveryLng,
    );
    return leftDistance - rightDistance;
  });

  return ranked.find((vehicle) => orderSlots(vehicle.capacityKg, vehicle.currentLoadPct) > 0) ?? null;
}

async function loadActiveVehicles(): Promise<ActiveVehicle[]> {
  const rows = await prisma.vehicle.findMany({
    where: {
      status: "ACTIVE",
      driver: {
        is: {
          status: "AVAILABLE",
          latitude: { not: null },
          longitude: { not: null },
        },
      },
    },
    include: {
      deliveryZone: { select: { code: true, active: true } },
      driver: {
        include: {
          user: { select: { name: true } },
        },
      },
    },
  });

  return rows.flatMap((row) => {
    if (
      !row.driver ||
      row.driver.latitude == null ||
      row.driver.longitude == null
    ) {
      return [];
    }

    return [
      {
        id: row.id,
        capacityKg: row.capacityKg,
        currentLoadPct: row.currentLoadPct,
        zone: row.deliveryZone?.code ?? row.zone,
        driver: {
          id: row.driver.id,
          latitude: row.driver.latitude,
          longitude: row.driver.longitude,
          user: row.driver.user,
        },
      },
    ];
  });
}

export async function listRoutes(): Promise<SerializedRoute[]> {
  await bootstrapDispatchData();

  const rows = await prisma.route.findMany({
    include: routeInclude,
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  return rows.map(serializeRoute);
}

export async function optimizePendingRoutes(): Promise<RouteOptimizeResult> {
  await bootstrapDispatchData();

  const pending = await prisma.order.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      orderNumber: true,
      deliveryLat: true,
      deliveryLng: true,
      createdAt: true,
    },
  });

  const zoneRows = await prisma.zone.findMany({
    where: { active: true },
    select: { id: true, code: true },
  });
  const zoneIdByCode = new Map(zoneRows.map((row) => [row.code, row.id]));
  const activeCodes = new Set(zoneRows.map((row) => row.code));
  const fallbackZone =
    (activeCodes.has("core") ? "core" : zoneRows[0]?.code) ?? "core";

  const grouped = new Map<string, PendingOrder[]>();
  for (const order of pending) {
    const geo = zoneFromPoint(order.deliveryLat, order.deliveryLng);
    const zone = activeCodes.size === 0 || activeCodes.has(geo) ? geo : fallbackZone;
    const bucket = grouped.get(zone) ?? [];
    bucket.push(order);
    grouped.set(zone, bucket);
  }

  const vehicles = await loadActiveVehicles();
  const created: SerializedRoute[] = [];
  const unmatched: RouteOptimizeResult["unmatched"] = [];
  const matches: Array<{ driverId: string; orderId: string; orderNumber: string }> = [];

  for (const [zone, orders] of grouped) {
    let remaining = [...orders];

    while (remaining.length > 0) {
      const vehicle = pickVehicle(zone, remaining, vehicles);
      if (!vehicle) {
        for (const order of remaining) {
          unmatched.push({
            orderId: order.id,
            orderNumber: order.orderNumber,
            reason: vehicles.length === 0 ? "NO_ACTIVE_VEHICLES" : "NO_CAPACITY",
          });
        }
        remaining = [];
        break;
      }

      const slots = Math.max(1, orderSlots(vehicle.capacityKg, vehicle.currentLoadPct));
      const batch = remaining.slice(0, slots);
      remaining = remaining.slice(batch.length);

      const start = {
        lat: vehicle.driver.latitude,
        lng: vehicle.driver.longitude,
      };
      const planned = nearestNeighbor(start, batch);
      const estimatedMinutes = Math.max(
        8,
        Math.round(planned.totalDistanceKm / 0.45 + 4 * batch.length),
      );
      const nextLoad = Math.min(
        100,
        vehicle.currentLoadPct + batch.length * 12,
      );

      const route = await prisma.$transaction(async (tx) => {
        const stillPending = await tx.order.findMany({
          where: {
            id: { in: batch.map((order) => order.id) },
            status: "PENDING",
          },
          select: { id: true, orderNumber: true },
        });

        if (stillPending.length === 0) {
          return null;
        }

        const driver = await tx.driver.findFirst({
          where: { id: vehicle.driver.id, status: "AVAILABLE" },
          select: { id: true },
        });

        if (!driver) {
          return null;
        }

        const createdRoute = await tx.route.create({
          data: {
            driverId: vehicle.driver.id,
            status: "OPTIMIZED",
            zone,
            zoneId: zoneIdByCode.get(zone) ?? null,
            waypoints: planned.waypoints as unknown as Prisma.InputJsonValue,
            totalDistanceKm: planned.totalDistanceKm,
            estimatedMinutes,
          },
          include: routeInclude,
        });

        await tx.order.updateMany({
          where: { id: { in: stillPending.map((order) => order.id) } },
          data: {
            status: "ASSIGNED",
            driverId: vehicle.driver.id,
          },
        });

        await tx.driver.update({
          where: { id: vehicle.driver.id },
          data: { status: "BUSY" },
        });

        await tx.vehicle.update({
          where: { id: vehicle.id },
          data: {
            currentLoadPct: nextLoad,
            zone,
            zoneId: zoneIdByCode.get(zone) ?? undefined,
          },
        });

        await tx.auditLog.createMany({
          data: stillPending.map((order) => ({
            orderId: order.id,
            action: "DRIVER_ASSIGNED",
            details: {
              driverId: vehicle.driver.id,
              routeId: createdRoute.id,
              source: "route-optimize",
              zone,
            },
          })),
        });

        return createdRoute;
      });

      const vehicleIndex = vehicles.findIndex((item) => item.id === vehicle.id);
      if (vehicleIndex >= 0) {
        vehicles.splice(vehicleIndex, 1);
      }

      if (!route) {
        unmatched.push(
          ...batch.map((order) => ({
            orderId: order.id,
            orderNumber: order.orderNumber,
            reason: "CONCURRENT_UPDATE",
          })),
        );
        continue;
      }

      created.push(serializeRoute(route));
      matches.push(
        ...batch.map((order) => ({
          driverId: vehicle.driver.id,
          orderId: order.id,
          orderNumber: order.orderNumber,
        })),
      );
    }
  }

  if (pending.length === 0) {
    return {
      ok: true,
      routesCreated: 0,
      assignedCount: 0,
      unmatchedCount: 0,
      routes: created,
      unmatched,
    };
  }

  if (matches.length > 0) {
    publishDispatchEvent({
      type: "orders.assigned",
      assignedCount: matches.length,
      matches,
    });
  }

  return {
    ok: true,
    routesCreated: created.length,
    assignedCount: matches.length,
    unmatchedCount: unmatched.length,
    routes: created,
    unmatched,
  };
}
