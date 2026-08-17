import { settleDriverCash } from "@/lib/analytics/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readDriverId(value: unknown): string | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const driverId = (value as { driverId?: unknown }).driverId;
  return typeof driverId === "string" && driverId.trim().length > 0
    ? driverId.trim()
    : null;
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const driverId = readDriverId(body);
  if (!driverId) {
    return Response.json({ ok: false, error: "driverId is required." }, { status: 400 });
  }

  try {
    const result = await settleDriverCash(driverId);
    return Response.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to settle cash.";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
