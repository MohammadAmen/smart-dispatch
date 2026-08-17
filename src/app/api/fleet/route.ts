import { STAFF_ROLES } from "@/lib/auth/constants";
import { isSession, requireRoles } from "@/lib/auth/server";
import { asFiniteNumber, asRecord, asString } from "@/lib/http";
import { createFleetVehicle, listFleetVehicles } from "@/lib/fleet/service";
import type { FleetListResponse } from "@/lib/fleet/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const session = await requireRoles(STAFF_ROLES);
  if (!isSession(session)) {
    return session;
  }

  try {
    const vehicles = await listFleetVehicles();
    return Response.json({ ok: true, vehicles } satisfies FleetListResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load fleet.";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<Response> {
  const session = await requireRoles(STAFF_ROLES);
  if (!isSession(session)) {
    return session;
  }

  let body: Record<string, unknown> | null;
  try {
    body = asRecord(await request.json());
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  if (!body) {
    return Response.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const plateNumber = asString(body.plateNumber);
  const model = asString(body.model);
  const type = asString(body.type) ?? asString(body.vehicleType);
  const vehicleTypeId = asString(body.vehicleTypeId);
  const zone = asString(body.zone);
  const zoneId = asString(body.zoneId);
  const capacityKg = asFiniteNumber(body.capacityKg) ?? undefined;

  if (!plateNumber || !model || (!vehicleTypeId && !type) || (!zoneId && !zone)) {
    return Response.json(
      { ok: false, error: "Plate, model, vehicle type, and zone are required." },
      { status: 400 },
    );
  }

  try {
    const vehicle = await createFleetVehicle({
      plateNumber,
      model,
      type: type ?? undefined,
      vehicleTypeId: vehicleTypeId ?? undefined,
      zone: zone ?? undefined,
      zoneId: zoneId ?? undefined,
      capacityKg,
    });
    return Response.json({ ok: true, vehicle }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create vehicle.";
    return Response.json({ ok: false, error: message }, { status: 400 });
  }
}
