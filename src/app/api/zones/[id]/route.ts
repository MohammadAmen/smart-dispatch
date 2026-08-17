import { STAFF_ROLES } from "@/lib/auth/constants";
import { isSession, requireRoles } from "@/lib/auth/server";
import { asBoolean, asRecord, asString } from "@/lib/http";
import { deleteZone, updateZone } from "@/lib/catalog/zones";

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
    const zone = await updateZone(id, {
      name: asString(body?.name) ?? undefined,
      city: asString(body?.city) ?? undefined,
      active: asBoolean(body?.active) ?? undefined,
    });
    if (!zone) {
      return Response.json({ ok: false, error: "Zone not found." }, { status: 404 });
    }
    return Response.json({ ok: true, zone });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update zone.";
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
  const result = await deleteZone(id);
  if (!result.ok) {
    return Response.json({ ok: false, error: result.error }, { status: result.status });
  }
  return Response.json({ ok: true });
}
