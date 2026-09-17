import { bootstrapDispatchData } from "@/lib/dispatch/bootstrap";
import { publishDispatchEvent } from "@/lib/dispatch/events";
import { expireStaleDriverOffer } from "@/lib/driver/offer";
import {
  isDriverJobStatus,
  toDriverAssignment,
  type AssignmentExtras,
} from "@/lib/driver/map-assignment";
import type {
  DriverDutyStatus,
  DriverPatchBody,
  DriverProfile,
  DriverSessionResponse,
} from "@/lib/driver/types";
import { calculateDistance, roundDistanceKm } from "@/lib/geo";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth/server";
import { ensureOrderBundleSchema } from "@/lib/stores/order-bundle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isDutyStatus(value: unknown): value is DriverDutyStatus {
  return value === "AVAILABLE" || value === "OFFLINE";
}

async function listProfiles(): Promise<DriverProfile[]> {
  const rows = await prisma.driver.findMany({
    include: { user: { select: { name: true } } },
    orderBy: { user: { name: "asc" } },
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.user.name,
    vehicleType: row.vehicleType,
    status: row.status,
  }));
}

function startOfLocalDay(now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

async function loadSession(driverId: string | null): Promise<DriverSessionResponse> {
  await bootstrapDispatchData();
  await ensureOrderBundleSchema();
  const drivers = await listProfiles();
  const driver = driverId ? (drivers.find((row) => row.id === driverId) ?? null) : null;

  if (!driver) {
    return { ok: true, drivers, driver: null, assignment: null, dailyEarnings: 0 };
  }

  await expireStaleDriverOffer(driver.id);

  const dayStart = startOfLocalDay();
  const [orders, driverRow, earnings] = await Promise.all([
    prisma.order.findMany({
      where: {
        driverId: driver.id,
        status: { in: ["ASSIGNED", "IN_TRANSIT"] },
      },
      include: {
        items: { select: { name: true, quantity: true } },
        store: { select: { name: true, address: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.driver.findUnique({
      where: { id: driver.id },
      select: { latitude: true, longitude: true },
    }),
    prisma.order.aggregate({
      where: {
        driverId: driver.id,
        status: "DELIVERED",
        updatedAt: { gte: dayStart },
      },
      _sum: { deliveryFee: true },
    }),
  ]);

  const visible = orders.filter((row) => row.bundleRole !== "CHILD");
  const active = visible.find((row) => row.status === "IN_TRANSIT") ?? visible[0] ?? null;
  const dailyEarnings = Math.max(0, Number(earnings._sum.deliveryFee ?? 0));

  let assignment = null;
  if (active && isDriverJobStatus(active.status)) {
    const anchorLat = active.pickupLat ?? active.deliveryLat;
    const anchorLng = active.pickupLng ?? active.deliveryLng;
    const driverLat = driverRow?.latitude;
    const driverLng = driverRow?.longitude;
    const distanceKm =
      driverLat != null && driverLng != null
        ? roundDistanceKm(calculateDistance(driverLat, driverLng, anchorLat, anchorLng), 1)
        : null;

    let extras: AssignmentExtras = {
      items: active.items.map((item) => ({
        name: { ar: item.name, en: item.name },
        qty: item.quantity,
      })),
      storeName: active.store?.name ?? null,
      distanceKm: Number.isFinite(distanceKm) ? distanceKm : null,
    };

    if (active.bundleRole === "PARENT") {
      const children = await prisma.order.findMany({
        where: { parentOrderId: active.id, status: { not: "CANCELED" } },
        include: {
          items: { select: { name: true, quantity: true } },
          store: { select: { name: true, address: true, latitude: true, longitude: true } },
        },
        orderBy: { orderNumber: "asc" },
      });
      extras = {
        items: children.flatMap((child) =>
          child.items.map((item) => ({
            name: {
              ar: child.store?.name ? `${item.name} · ${child.store.name}` : item.name,
              en: child.store?.name ? `${item.name} · ${child.store.name}` : item.name,
            },
            qty: item.quantity,
          })),
        ),
        storeName: children.find((child) => child.store?.name)?.store?.name ?? extras.storeName,
        distanceKm: extras.distanceKm,
        stops: [
          ...children.map((child) => ({
            kind: "pickup" as const,
            title: {
              ar: child.store?.name ?? "استلام",
              en: child.store?.name ?? "Pickup",
            },
            detail: child.store?.address ?? child.storeNotes ?? "",
            point:
              child.pickupLat != null && child.pickupLng != null
                ? ([child.pickupLat, child.pickupLng] as [number, number])
                : child.store?.latitude != null && child.store.longitude != null
                  ? ([child.store.latitude, child.store.longitude] as [number, number])
                  : null,
          })),
          {
            kind: "dropoff" as const,
            title: { ar: "تسليم العميل", en: "Customer drop-off" },
            detail: active.addressText,
            point: [active.deliveryLat, active.deliveryLng] as [number, number],
          },
        ],
      };
    }

    assignment = toDriverAssignment(active, extras);
  }

  return {
    ok: true,
    drivers,
    driver,
    assignment,
    dailyEarnings,
  };
}

export async function GET(request: Request): Promise<Response> {
  try {
    const requestedId = new URL(request.url).searchParams.get("driverId");
    let driverId = requestedId && requestedId.trim().length > 0 ? requestedId.trim() : null;

    if (!driverId) {
      const session = await readSession();
      if (session?.role === "DRIVER") {
        const linked = await prisma.driver.findUnique({
          where: { userId: session.sub },
          select: { id: true },
        });
        driverId = linked?.id ?? null;
      }
    }

    const payload = await loadSession(driverId);
    return Response.json(payload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load driver session.";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request): Promise<Response> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const record = asRecord(body);
  const driverId = asString(record?.driverId);
  if (!driverId) {
    return Response.json({ ok: false, error: "driverId is required." }, { status: 400 });
  }

  const patch: DriverPatchBody = { driverId };
  const status = record?.status;
  if (status !== undefined) {
    if (!isDutyStatus(status)) {
      return Response.json({ ok: false, error: "Invalid status." }, { status: 400 });
    }
    patch.status = status;
  }

  const latitude = asNumber(record?.latitude);
  const longitude = asNumber(record?.longitude);
  if (latitude != null && longitude != null) {
    patch.latitude = latitude;
    patch.longitude = longitude;
  }

  try {
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      select: { id: true },
    });

    if (!driver) {
      return Response.json({ ok: false, error: "Driver not found." }, { status: 404 });
    }

    const active = await prisma.order.findFirst({
      where: {
        driverId,
        status: { in: ["ASSIGNED", "IN_TRANSIT"] },
      },
      select: { id: true },
    });

    await prisma.driver.update({
      where: { id: driverId },
      data: {
        ...(patch.status
          ? {
              status:
                patch.status === "OFFLINE"
                  ? "OFFLINE"
                  : active
                    ? "BUSY"
                    : "AVAILABLE",
            }
          : {}),
        ...(patch.latitude != null && patch.longitude != null
          ? { latitude: patch.latitude, longitude: patch.longitude }
          : {}),
      },
    });

    publishDispatchEvent({ type: "orders.changed" });
    const session = await loadSession(driverId);
    return Response.json(session);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update driver.";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
