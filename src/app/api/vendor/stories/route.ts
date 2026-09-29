import { SUPER_ADMIN_ROLES, VENDOR_ROLES } from "@/lib/auth/constants";
import { isSession, requireRoles } from "@/lib/auth/server";
import { assertStoreOwnedBy } from "@/lib/stores/service";
import { createStoreStory } from "@/lib/stores/story-service";
import { deleteStoryVideo, isVideoFile, saveStoryVideo } from "@/lib/stores/story-video";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function asText(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

export async function POST(request: Request): Promise<Response> {
  const session = await requireRoles([...VENDOR_ROLES, ...SUPER_ADMIN_ROLES]);
  if (!isSession(session)) {
    return session;
  }

  let videoUrl = "";
  try {
    const form = await request.formData();
    const storeId = asText(form, "storeId").trim();
    if (!storeId) {
      return Response.json({ ok: false, error: "Store is required." }, { status: 400 });
    }
    if (!SUPER_ADMIN_ROLES.includes(session.role)) {
      await assertStoreOwnedBy(storeId, session.sub);
    }

    const video = form.get("video");
    if (!isVideoFile(video)) {
      return Response.json({ ok: false, error: "A video is required." }, { status: 400 });
    }

    const duration = Number.parseFloat(asText(form, "duration"));
    const price = Number.parseFloat(asText(form, "price"));
    const productId = asText(form, "productId").trim();
    videoUrl = await saveStoryVideo(video, duration);
    const story = await createStoreStory(storeId, {
      title: asText(form, "title"),
      description: asText(form, "description"),
      isOrderable: asText(form, "isOrderable") === "true",
      productId: productId || null,
      price: Number.isFinite(price) ? price : null,
      videoUrl,
      duration,
    });
    return Response.json({ ok: true, id: story.id });
  } catch (error) {
    if (videoUrl) {
      await deleteStoryVideo(videoUrl).catch(() => undefined);
    }
    const message = error instanceof Error ? error.message : "Upload failed.";
    return Response.json({ ok: false, error: message }, { status: 400 });
  }
}
