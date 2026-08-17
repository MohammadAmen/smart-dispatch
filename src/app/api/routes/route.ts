import { STAFF_ROLES } from "@/lib/auth/constants";
import { isSession, requireRoles } from "@/lib/auth/server";
import { listRoutes } from "@/lib/routes/optimize";
import type { RouteListResponse } from "@/lib/routes/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const session = await requireRoles(STAFF_ROLES);
  if (!isSession(session)) {
    return session;
  }

  try {
    const routes = await listRoutes();
    return Response.json({ ok: true, routes } satisfies RouteListResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load routes.";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
