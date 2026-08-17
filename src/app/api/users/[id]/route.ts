import { STAFF_ROLES } from "@/lib/auth/constants";
import { isSession, requireRoles } from "@/lib/auth/server";
import { asRecord, asString } from "@/lib/http";
import { deleteManagedUser, updateManagedUser } from "@/lib/users/service";
import { isUserRole } from "@/lib/users/types";

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
  if (!id) {
    return Response.json({ ok: false, error: "User id is required." }, { status: 400 });
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

  const roleValue = asString(body.role);
  if (roleValue && !isUserRole(roleValue)) {
    return Response.json({ ok: false, error: "Invalid role." }, { status: 400 });
  }

  try {
    const user = await updateManagedUser(id, {
      name: asString(body.name) ?? undefined,
      email: asString(body.email) ?? undefined,
      phone: asString(body.phone) ?? undefined,
      role: roleValue && isUserRole(roleValue) ? roleValue : undefined,
      language: asString(body.language) ?? undefined,
      password: asString(body.password) ?? undefined,
      vehicleType: asString(body.vehicleType) ?? undefined,
      ...("vehicleId" in body
        ? { vehicleId: body.vehicleId === null ? null : asString(body.vehicleId) }
        : {}),
    });

    if (!user) {
      return Response.json({ ok: false, error: "User not found." }, { status: 404 });
    }

    return Response.json({ ok: true, user });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update user.";
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
  if (!id) {
    return Response.json({ ok: false, error: "User id is required." }, { status: 400 });
  }

  try {
    const result = await deleteManagedUser(id, session.sub);
    if (!result.ok) {
      return Response.json({ ok: false, error: result.error }, { status: result.status });
    }

    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete user.";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
