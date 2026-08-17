import { STAFF_ROLES } from "@/lib/auth/constants";
import { isSession, requireRoles } from "@/lib/auth/server";
import { asFiniteNumber, asNumber, asRecord, asString } from "@/lib/http";
import { deleteFleetVehicle, updateFleetVehicle } from "@/lib/fleet/service";
import { isVehicleStatus, type VehiclePatchInput } from "@/lib/fleet/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readPatch(body: Record<string, unknown>): VehiclePatchInput {
  const statusValue = asString(body.status);
  const driverIdRaw = body.driverId;

  return {
    plateNumber: asString(body.plateNumber) ?? undefined,
    model: asString(body.model) ?? undefined,
    status: statusValue && isVehicleStatus(statusValue) ? statusValue : undefined,
    zone: asString(body.zone) ?? undefined,
    zoneId: asString(body.zoneId) ?? undefined,
    vehicleTypeId: asString(body.vehicleTypeId) ?? undefined,
    capacityKg: asFiniteNumber(body.capacityKg) ?? undefined,
    currentLoadPct: asNumber(body.currentLoadPct) ?? undefined,
    driverId:
      driverIdRaw === null
        ? null
        : typeof driverIdRaw === "string"
          ? driverIdRaw
          : undefined,
  };
}

async function applyUpdate(
  id: string,
  patch: VehiclePatchInput,
  required: boolean,
): Promise<Response> {
  if (!id) {
    return Response.json({ ok: false, error: "Vehicle id is required." }, { status: 400 });
  }

  if (required) {
    if (!patch.plateNumber || !patch.model || !patch.vehicleTypeId || !patch.zoneId || !patch.status) {
      return Response.json(
        {
          ok: false,
          error: "Plate, model, vehicle type, zone, and status are required.",
        },
        { status: 400 },
      );
    }
  }

  const statusValue = patch.status;
  if (statusValue && !isVehicleStatus(statusValue)) {
    return Response.json({ ok: false, error: "Invalid vehicle status." }, { status: 400 });
  }

  try {
    const vehicle = await updateFleetVehicle(id, patch);
    if (!vehicle) {
      return Response.json({ ok: false, error: "Vehicle not found." }, { status: 404 });
    }
    return Response.json({ ok: true, vehicle });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update vehicle.";
    return Response.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await requireRoles(STAFF_ROLES);
  if (!isSession(session)) {
    return session;
  }

  const { id } = await context.params;
  let body: Record<string, unknown> | null;
  try {
    body = asRecord(await request.json());
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  if (!body) {
    return Response.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const statusValue = asString(body.status);
  if (statusValue && !isVehicleStatus(statusValue)) {
    return Response.json({ ok: false, error: "Invalid vehicle status." }, { status: 400 });
  }

  return applyUpdate(id, readPatch(body), true);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await requireRoles(STAFF_ROLES);
  if (!isSession(session)) {
    return session;
  }

  const { id } = await context.params;
  let body: Record<string, unknown> | null;
  try {
    body = asRecord(await request.json());
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  if (!body) {
    return Response.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const statusValue = asString(body.status);
  if (statusValue && !isVehicleStatus(statusValue)) {
    return Response.json({ ok: false, error: "Invalid vehicle status." }, { status: 400 });
  }

  return applyUpdate(id, readPatch(body), false);
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await requireRoles(STAFF_ROLES);
  if (!isSession(session)) {
    return session;
  }

  const { id } = await context.params;
  if (!id) {
    return Response.json({ ok: false, error: "Vehicle id is required." }, { status: 400 });
  }

  try {
    const result = await deleteFleetVehicle(id);
    if (!result) {
      return Response.json({ ok: false, error: "Vehicle not found." }, { status: 404 });
    }

    return Response.json({
      ok: true,
      ...result,
      message: result.deleted
        ? "Vehicle deleted."
        : "Vehicle was unassigned and set inactive because a driver is on an active route.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete vehicle.";
    return Response.json({ ok: false, error: message }, { status: 400 });
  }
}
