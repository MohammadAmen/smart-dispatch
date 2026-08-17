import { runAutoAssign } from "@/lib/dispatch/auto-assign";
import type { AutoAssignRequestBody } from "@/lib/dispatch/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readOrderId(value: unknown): string | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  const orderId = (value as AutoAssignRequestBody).orderId;
  return typeof orderId === "string" && orderId.trim().length > 0
    ? orderId.trim()
    : undefined;
}

export async function POST(request: Request): Promise<Response> {
  let orderId: string | undefined;

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      orderId = readOrderId(await request.json());
    } catch {
      return Response.json(
        { ok: false, error: "Invalid JSON body." },
        { status: 400 },
      );
    }
  }

  try {
    const result = await runAutoAssign({ orderId });
    return Response.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Auto-assign failed.";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
