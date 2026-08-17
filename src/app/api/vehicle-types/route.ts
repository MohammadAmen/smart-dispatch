import { STAFF_ROLES } from "@/lib/auth/constants";
import { isSession, requireRoles } from "@/lib/auth/server";
import { asBoolean, asFiniteNumber, asRecord, asString } from "@/lib/http";
import { createVehicleType, listVehicleTypes } from "@/lib/catalog/vehicle-types";
import { bootstrapDispatchData } from "@/lib/dispatch/bootstrap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const session = await requireRoles(STAFF_ROLES);
  if (!isSession(session)) {
    return session;
  }

  try {
    await bootstrapDispatchData();
    const activeOnly = new URL(request.url).searchParams.get("active") === "1";
    const vehicleTypes = await listVehicleTypes(activeOnly);
    return Response.json({ ok: true, vehicleTypes });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load vehicle types.";
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

  const name = asString(body?.name);
  const icon = asString(body?.icon) ?? "truck";
  const maxWeightKg = asFiniteNumber(body?.maxWeightKg);
  const active = asBoolean(body?.active);

  if (!name || maxWeightKg == null) {
    return Response.json(
      { ok: false, error: "Name and max weight are required." },
      { status: 400 },
    );
  }

  try {
    const vehicleType = await createVehicleType({
      name,
      icon,
      maxWeightKg,
      active: active ?? true,
    });
    return Response.json({ ok: true, vehicleType }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create vehicle type.";
    return Response.json({ ok: false, error: message }, { status: 400 });
  }
}
