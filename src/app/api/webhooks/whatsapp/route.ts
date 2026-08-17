import { createOrderFromWhatsApp, verifyWhatsAppSignature } from "@/lib/dispatch/ingest-whatsapp";
import { parseWhatsAppMessages, verifyWhatsAppToken } from "@/lib/dispatch/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && challenge && verifyWhatsAppToken(token)) {
    return new Response(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  return new Response("Forbidden", { status: 403 });
}

export async function POST(request: Request): Promise<Response> {
  let rawBody: string;

  try {
    rawBody = await request.text();
  } catch {
    return Response.json({ ok: false, error: "Empty body." }, { status: 400 });
  }

  const signature = request.headers.get("x-hub-signature-256");
  if (!verifyWhatsAppSignature(rawBody, signature)) {
    return new Response("Invalid signature", { status: 403 });
  }

  let payload: unknown;
  try {
    payload = rawBody.length > 0 ? (JSON.parse(rawBody) as unknown) : {};
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  try {
    const messages = parseWhatsAppMessages(payload);
    const createdOrderNumbers: string[] = [];

    for (const message of messages) {
      const order = await createOrderFromWhatsApp(message);
      if (order) {
        createdOrderNumbers.push(order.id);
      }
    }

    return Response.json({
      ok: true,
      received: messages.length,
      created: createdOrderNumbers.length,
      orderNumbers: createdOrderNumbers,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Webhook processing failed.";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
