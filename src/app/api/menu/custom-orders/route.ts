import { appendMenuTrackToken } from "@/lib/stores/menu-track-cookie";
import { placeSpecialCustomOrder } from "@/lib/stores/custom-order-service";
import { saveCustomOrderImage, isImageFile } from "@/lib/stores/product-image";
import { asFiniteNumber } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ ok: false, error: "Invalid form data." }, { status: 400 });
  }

  const imageValue = form.get("image");
  let customImage: string | null = null;
  try {
    if (isImageFile(imageValue)) {
      customImage = await saveCustomOrderImage(imageValue);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save the image.";
    return Response.json({ ok: false, error: message }, { status: 400 });
  }

  try {
    const result = await placeSpecialCustomOrder({
      storeId: String(form.get("storeId") ?? ""),
      phone: String(form.get("phone") ?? ""),
      addressText: String(form.get("addressText") ?? ""),
      customNotes: String(form.get("customNotes") ?? ""),
      scheduledDate: String(form.get("scheduledDate") ?? ""),
      customImage,
      latitude: asFiniteNumber(form.get("latitude")),
      longitude: asFiniteNumber(form.get("longitude")),
    });
    await appendMenuTrackToken(result.trackingToken);
    return Response.json({
      ok: true,
      orderNumber: result.orderNumber,
      trackingToken: result.trackingToken,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not place the custom order.";
    return Response.json({ ok: false, error: message }, { status: 400 });
  }
}
