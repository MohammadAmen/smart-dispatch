import { STAFF_ROLES } from "@/lib/auth/constants";
import { isSession, requireRoles } from "@/lib/auth/server";
import { optimizePendingRoutes } from "@/lib/routes/optimize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(): Promise<Response> {
  const session = await requireRoles(STAFF_ROLES);
  if (!isSession(session)) {
    return session;
  }

  try {
    const result = await optimizePendingRoutes();
    return Response.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Route optimization failed.";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
