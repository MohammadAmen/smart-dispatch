import { readSession } from "@/lib/auth/server";
import { presentDriverOffer } from "@/lib/driver/offer";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  return value as Record<string, unknown>;
}

export async function POST(request: Request): Promise<Response> {
  const session = await readSession();
  if (!session || session.role !== "DRIVER") {
    return Response.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  let orderId = "";
  try {
    const body = asRecord(await request.json());
    orderId = typeof body?.orderId === "string" ? body.orderId.trim() : "";
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  if (!orderId) {
    return Response.json({ ok: false, error: "Invalid offer payload." }, { status: 400 });
  }

  const driver = await prisma.driver.findUnique({
    where: { userId: session.sub },
    select: { id: true },
  });
  if (!driver) {
    return Response.json({ ok: false, error: "Driver not found." }, { status: 404 });
  }

  const offerPresentedAt = await presentDriverOffer(orderId, driver.id);
  return Response.json({ ok: offerPresentedAt != null, offerPresentedAt });
}
