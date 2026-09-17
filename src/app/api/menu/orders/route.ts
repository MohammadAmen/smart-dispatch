import { mergeMenuTrackTokens, readMenuTrackTokens } from "@/lib/stores/menu-track-cookie";
import { isTrackingToken, uniqueTrackingTokens } from "@/lib/stores/tracking-token";
import { getPublicOrdersByTokens } from "@/lib/stores/vendor-orders";
import type { VendorOrderRecord } from "@/lib/stores/order-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface PublicOrdersResponse {
  ok: true;
  orders: VendorOrderRecord[];
}

async function loadOwnedOrders(tokens: string[]): Promise<VendorOrderRecord[]> {
  const merged = await mergeMenuTrackTokens(tokens);
  return getPublicOrdersByTokens(merged);
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const urlToken = url.searchParams.get("token")?.trim() ?? "";
  const cookieTokens = await readMenuTrackTokens();
  const tokens = uniqueTrackingTokens([urlToken, ...cookieTokens]);

  try {
    if (isTrackingToken(urlToken)) {
      await mergeMenuTrackTokens(tokens);
    }
    const orders = await getPublicOrdersByTokens(tokens);
    return Response.json({ ok: true, orders } satisfies PublicOrdersResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load orders.";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<Response> {
  let bodyTokens: unknown[] = [];

  try {
    const body = (await request.json()) as { tokens?: unknown };
    if (Array.isArray(body.tokens)) {
      bodyTokens = body.tokens;
    }
  } catch {
    bodyTokens = [];
  }

  try {
    const orders = await loadOwnedOrders(uniqueTrackingTokens(bodyTokens));
    return Response.json({ ok: true, orders } satisfies PublicOrdersResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load orders.";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
