import { STAFF_ROLES } from "@/lib/auth/constants";
import { isSession, requireRoles } from "@/lib/auth/server";
import { asBoolean, asFiniteNumber, asRecord, asString } from "@/lib/http";
import { deleteVehicleType, updateVehicleType } from "@/lib/catalog/vehicle-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  try {
    const vehicleType = await updateVehicleType(id, {
      name: asString(body?.name) ?? undefined,
      icon: asString(body?.icon) ?? undefined,
      maxWeightKg: asFiniteNumber(body?.maxWeightKg) ?? undefined,
      active: asBoolean(body?.active) ?? undefined,
    });
    if (!vehicleType) {
      return Response.json({ ok: false, error: "Vehicle type not found." }, { status: 404 });
    }
    return Response.json({ ok: true, vehicleType });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update vehicle type.";
    return Response.json({ ok: false, error: message }, { status: 400 });
  }
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
  const result = await deleteVehicleType(id);
  if (!result.ok) {
    return Response.json({ ok: false, error: result.error }, { status: result.status });
  }
  return Response.json({ ok: true });
}
