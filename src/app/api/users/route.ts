import { STAFF_ROLES } from "@/lib/auth/constants";
import { isSession, requireRoles } from "@/lib/auth/server";
import { asRecord, asString } from "@/lib/http";
import { createManagedUser, listManagedUsers } from "@/lib/users/service";
import { isUserRole, type UsersListResponse } from "@/lib/users/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const session = await requireRoles(STAFF_ROLES);
  if (!isSession(session)) {
    return session;
  }

  try {
    const users = await listManagedUsers();
    return Response.json({ ok: true, users } satisfies UsersListResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load users.";
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

  const name = asString(body.name);
  const email = asString(body.email);
  const phone = asString(body.phone);
  const role = asString(body.role);
  const language = asString(body.language) ?? "ar";
  const password = asString(body.password) ?? undefined;
  const vehicleType = asString(body.vehicleType) ?? undefined;
  const vehicleId = body.vehicleId === null ? null : asString(body.vehicleId);

  if (!name || !email || !phone || !role || !isUserRole(role)) {
    return Response.json(
      { ok: false, error: "Name, email, phone, and a valid role are required." },
      { status: 400 },
    );
  }

  try {
    const user = await createManagedUser({
      name,
      email,
      phone,
      role,
      language,
      password,
      vehicleType,
      vehicleId,
    });
    return Response.json({ ok: true, user }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create user.";
    return Response.json({ ok: false, error: message }, { status: 400 });
  }
}
