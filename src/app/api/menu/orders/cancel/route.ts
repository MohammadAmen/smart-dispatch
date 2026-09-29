import { NextResponse } from "next/server";

import { cancelPublicOrderByToken } from "@/lib/stores/vendor-orders";
import { isTrackingToken } from "@/lib/stores/tracking-token";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  let token = "";
  try {
    const body = (await request.json()) as { token?: unknown };
    token = typeof body.token === "string" ? body.token.trim() : "";
  } catch {
    token = "";
  }

  if (!isTrackingToken(token)) {
    return NextResponse.json({ ok: false, error: "Invalid tracking link." }, { status: 400 });
  }

  try {
    const order = await cancelPublicOrderByToken(token);
    return NextResponse.json({ ok: true, order });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not cancel the order.";
    const status = message === "Order not found." ? 404 : 409;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
