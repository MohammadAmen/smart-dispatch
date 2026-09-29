import { STAFF_ROLES } from "@/lib/auth/constants";
import { isSession, requireRoles } from "@/lib/auth/server";
import { getUserActivity } from "@/lib/users/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
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
    const activity = await getUserActivity(id);
    if (!activity) {
      return Response.json({ ok: false, error: "User not found." }, { status: 404 });
    }

    return Response.json({ ok: true, activity });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load activity.";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
