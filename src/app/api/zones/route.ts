import { STAFF_ROLES } from "@/lib/auth/constants";
import { isSession, requireRoles } from "@/lib/auth/server";
import { asBoolean, asRecord, asString } from "@/lib/http";
import { createZone, listZones } from "@/lib/catalog/zones";
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
    const zones = await listZones(activeOnly);
    return Response.json({ ok: true, zones });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load zones.";
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
  const city = asString(body?.city);
  const active = asBoolean(body?.active);

  if (!name || !city) {
    return Response.json(
      { ok: false, error: "Name and city are required." },
      { status: 400 },
    );
  }

  try {
    const zone = await createZone({ name, city, active: active ?? true });
    return Response.json({ ok: true, zone }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create zone.";
    return Response.json({ ok: false, error: message }, { status: 400 });
  }
}
