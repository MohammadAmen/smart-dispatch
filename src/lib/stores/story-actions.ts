"use server";

import { revalidatePath } from "next/cache";

import { SUPER_ADMIN_ROLES, VENDOR_ROLES } from "@/lib/auth/constants";
import { isSession, requireRoles } from "@/lib/auth/server";
import { assertStoreOwnedBy } from "@/lib/stores/service";
import {
  createAdminStory,
  createStoreStory,
  deleteAdminStory,
  deleteStoreStory,
  updateAdminStory,
  updateStoreStory,
} from "@/lib/stores/story-service";
import { STORY_TTL_MS, asActionType, type StoryActionType } from "@/lib/stores/story-types";
import { detectStoryMedia, isVideoFile, saveStoryMedia, saveStoryVideo } from "@/lib/stores/story-video";

export interface StoryActionResult {
  ok: boolean;
  error?: string;
}

function asString(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

function asOptional(form: FormData, key: string): string | null {
  const value = asString(form, key).trim();
  return value.length > 0 ? value : null;
}

function asBoolean(form: FormData, key: string): boolean {
  const value = form.get(key);
  return value === "on" || value === "true" || value === "1";
}

function fail(error: unknown): StoryActionResult {
  return {
    ok: false,
    error: error instanceof Error ? error.message : "Request failed.",
  };
}

function revalidateStories(): void {
  const paths = ["/vendor/stories", "/vendor/dashboard", "/menu", "/menu/stores", "/admin/stories"];
  for (const path of paths) {
    revalidatePath(path);
    revalidatePath(`/ar${path}`);
    revalidatePath(`/en${path}`);
  }
}

function parseExpiry(form: FormData): Date {
  const custom = asBoolean(form, "customExpiry");
  const hours = Number.parseFloat(asString(form, "expiresHours"));
  if (custom && Number.isFinite(hours) && hours > 0) {
    const capped = Math.min(24 * 30, hours);
    return new Date(Date.now() + capped * 60 * 60 * 1000);
  }
  return new Date(Date.now() + STORY_TTL_MS);
}

async function requireVendorStore(storeId: string): Promise<StoryActionResult | { ownerId: string }> {
  const session = await requireRoles([...VENDOR_ROLES, ...SUPER_ADMIN_ROLES]);
  if (!isSession(session)) {
    return { ok: false, error: "Unauthorized." };
  }
  try {
    if (!SUPER_ADMIN_ROLES.includes(session.role)) {
      await assertStoreOwnedBy(storeId, session.sub);
    }
    return { ownerId: session.sub };
  } catch (error) {
    return fail(error);
  }
}

export async function saveStoryAction(formData: FormData): Promise<StoryActionResult> {
  const storeId = asString(formData, "storeId");
  const access = await requireVendorStore(storeId);
  if ("ok" in access) {
    return access;
  }

  try {
    const id = asOptional(formData, "id");
    const payload = {
      title: asString(formData, "title"),
      description: asString(formData, "description"),
      isOrderable: asBoolean(formData, "isOrderable"),
      productId: asOptional(formData, "productId"),
      price: Number.parseFloat(asString(formData, "price")),
    };
    if (id) {
      await updateStoreStory(storeId, id, payload);
    } else {
      const video = formData.get("video");
      if (!isVideoFile(video)) {
        return { ok: false, error: "A video is required." };
      }
      const duration = Number.parseFloat(asString(formData, "duration"));
      const videoUrl = await saveStoryVideo(video, duration);
      await createStoreStory(storeId, { ...payload, videoUrl, duration });
    }
    revalidateStories();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function saveAdminStoryAction(formData: FormData): Promise<StoryActionResult> {
  const session = await requireRoles(SUPER_ADMIN_ROLES);
  if (!isSession(session)) {
    return { ok: false, error: "Unauthorized." };
  }

  try {
    const id = asOptional(formData, "id");
    const actionType: StoryActionType = asActionType(asString(formData, "actionType"));
    const payload = {
      title: asString(formData, "title"),
      description: asString(formData, "description"),
      actionType,
      contactNumber: asOptional(formData, "contactNumber"),
      externalLink: asOptional(formData, "externalLink"),
      expiresAt: parseExpiry(formData),
    };
    if (id) {
      await updateAdminStory(id, payload);
    } else {
      const media = detectStoryMedia(formData.get("media") ?? formData.get("video"));
      if (!media) {
        return { ok: false, error: "A video or image is required." };
      }
      const duration = Number.parseFloat(asString(formData, "duration"));
      const videoUrl = await saveStoryMedia(media.file, media.mediaType, duration);
      await createAdminStory({
        ...payload,
        videoUrl,
        mediaType: media.mediaType,
        duration,
      });
    }
    revalidateStories();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteAdminStoryAction(formData: FormData): Promise<StoryActionResult> {
  const session = await requireRoles(SUPER_ADMIN_ROLES);
  if (!isSession(session)) {
    return { ok: false, error: "Unauthorized." };
  }

  try {
    await deleteAdminStory(asString(formData, "id"));
    revalidateStories();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteStoryAction(formData: FormData): Promise<StoryActionResult> {
  const storeId = asString(formData, "storeId");
  const access = await requireVendorStore(storeId);
  if ("ok" in access) {
    return access;
  }

  try {
    await deleteStoreStory(storeId, asString(formData, "id"));
    revalidateStories();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}
