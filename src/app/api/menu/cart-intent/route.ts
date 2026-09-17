import { logCartIntent } from "@/lib/stores/vendor-intel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return Response.json({ ok: false }, { status: 400 });
  }
  const row = body as Record<string, unknown>;
  if (typeof row.storeId !== "string" || typeof row.productId !== "string") {
    return Response.json({ ok: false }, { status: 400 });
  }
  try {
    await logCartIntent(row.storeId, row.productId);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: true });
  }
}
