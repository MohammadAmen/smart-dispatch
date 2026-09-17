import { logMenuSearch } from "@/lib/stores/vendor-intel";

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
  if (typeof row.query !== "string") {
    return Response.json({ ok: false }, { status: 400 });
  }
  try {
    await logMenuSearch({
      query: row.query,
      storeId: typeof row.storeId === "string" ? row.storeId : null,
      city: typeof row.city === "string" ? row.city : null,
      results: typeof row.results === "number" ? row.results : 0,
    });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: true });
  }
}
