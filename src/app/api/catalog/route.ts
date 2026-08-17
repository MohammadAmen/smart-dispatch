import { STAFF_ROLES } from "@/lib/auth/constants";
import { isSession, requireRoles } from "@/lib/auth/server";
import { bootstrapDispatchData } from "@/lib/dispatch/bootstrap";
import { listVehicleTypes } from "@/lib/catalog/vehicle-types";
import { listZones } from "@/lib/catalog/zones";
import type { CatalogListsResponse } from "@/lib/catalog/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const session = await requireRoles(STAFF_ROLES);
  if (!isSession(session)) {
    return session;
  }

  const activeOnly = new URL(request.url).searchParams.get("active") === "1";

  try {
    await bootstrapDispatchData();
    const [zones, vehicleTypes] = await Promise.all([
      listZones(activeOnly),
      listVehicleTypes(activeOnly),
    ]);
    return Response.json({ ok: true, zones, vehicleTypes } satisfies CatalogListsResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load catalog.";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
