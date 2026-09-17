import { acceptDriverOffer, declineDriverOffer, type DriverOfferAction } from "@/lib/driver/offer";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function isOfferAction(value: unknown): value is DriverOfferAction {
  return value === "accept" || value === "reject" || value === "timeout";
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const record = asRecord(body);
  const driverId = asString(record?.driverId);
  const orderId = asString(record?.orderId);
  const action = record?.action;

  if (!driverId || !orderId || !isOfferAction(action)) {
    return Response.json({ ok: false, error: "Invalid offer payload." }, { status: 400 });
  }

  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
    select: { id: true },
  });
  if (!driver) {
    return Response.json({ ok: false, error: "Driver not found." }, { status: 404 });
  }

  const ok =
    action === "accept"
      ? await acceptDriverOffer(orderId, driverId)
      : await declineDriverOffer(orderId, driverId, action === "timeout" ? "timeout" : "reject");

  return Response.json({ ok });
}
