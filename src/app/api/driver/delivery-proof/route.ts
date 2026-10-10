import { persistUpload } from "@/lib/uploads";
import { assertDeliveryProof } from "@/lib/finance/service";
import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 2_500_000;

/**
 * Pre-validate delivery proof (OTP / photo) before the driver queues ORDER_DELIVERED.
 * Soft-fails open only when policy is NONE.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const form = await request.formData();
    const orderId = String(form.get("orderId") ?? "").trim();
    const otp = String(form.get("otp") ?? "").trim();
    const driverId = String(form.get("driverId") ?? "").trim();
    const photo = form.get("photo");

    if (!orderId) {
      return Response.json({ ok: false, error: "order-required" }, { status: 400 });
    }

    if (driverId) {
      const session = await readSession();
      if (session?.role === "DRIVER") {
        const linked = await prisma.driver.findUnique({
          where: { userId: session.sub },
          select: { id: true },
        });
        if (linked && linked.id !== driverId) {
          return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
        }
      }
    }

    let photoUrl: string | null = null;
    if (photo instanceof File && photo.size > 0) {
      if (photo.size > MAX_BYTES) {
        return Response.json({ ok: false, error: "photo-too-large" }, { status: 400 });
      }
      const bytes = new Uint8Array(await photo.arrayBuffer());
      photoUrl = await persistUpload({
        folder: "delivery",
        mimeType: photo.type || "image/jpeg",
        bytes,
      });
    } else {
      const existing = String(form.get("photoUrl") ?? "").trim();
      photoUrl = existing || null;
    }

    const result = await assertDeliveryProof({
      orderId,
      otp: otp || null,
      photoUrl,
    });

    if (!result.ok) {
      return Response.json({ ok: false, error: result.error }, { status: 400 });
    }

    return Response.json({ ok: true, photoUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "proof-failed";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
