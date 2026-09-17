import { confirmCustomOrderQuote } from "@/lib/stores/custom-order-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const token =
    typeof body === "object" && body !== null && typeof (body as { token?: unknown }).token === "string"
      ? (body as { token: string }).token
      : "";

  try {
    const result = await confirmCustomOrderQuote(token);
    return Response.json({ ok: true, orderNumber: result.orderNumber });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not confirm the quote.";
    return Response.json({ ok: false, error: message }, { status: 400 });
  }
}
