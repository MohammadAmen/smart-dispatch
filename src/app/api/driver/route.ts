import { bootstrapDispatchData } from "@/lib/dispatch/bootstrap";
import { publishDispatchEvent } from "@/lib/dispatch/events";
import { isDriverJobStatus, toDriverAssignment } from "@/lib/driver/map-assignment";
import type {
  DriverDutyStatus,
  DriverPatchBody,
  DriverProfile,
  DriverSessionResponse,
} from "@/lib/driver/types";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth/server";

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

async function loadSession(driverId: string | null): Promise<DriverSessionResponse> {
  await bootstrapDispatchData();
  const drivers = await listProfiles();
  const driver = driverId ? (drivers.find((row) => row.id === driverId) ?? null) : null;

  if (!driver) {
    return { ok: true, drivers, driver: null, assignment: null };
  }

    const orders = await prisma.order.findMany({
      where: {
        driverId: driver.id,
        status: { in: ["ASSIGNED", "IN_TRANSIT"] },
      },
      orderBy: { createdAt: "asc" },
    });

    const active =
      orders.find((row) => row.status === "IN_TRANSIT") ?? orders[0] ?? null;

    return {
      ok: true,
      drivers,
      driver,
      assignment:
        active && isDriverJobStatus(active.status)
          ? toDriverAssignment(active)
          : null,
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
