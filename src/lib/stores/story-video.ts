import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { STORY_IMAGE_SECONDS, STORY_MAX_SECONDS, type StoryMediaType } from "@/lib/stores/story-types";

const MAX_VIDEO_BYTES = 20 * 1024 * 1024;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const VIDEO_EXTENSION: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

const IMAGE_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function isVideoFile(value: FormDataEntryValue | null): value is File {
  return typeof File !== "undefined" && value instanceof File && value.size > 0 && value.type.startsWith("video/");
}

export function isImageFile(value: FormDataEntryValue | null): value is File {
  return typeof File !== "undefined" && value instanceof File && value.size > 0 && value.type.startsWith("image/");
}

export function detectStoryMedia(
  value: FormDataEntryValue | null,
): { file: File; mediaType: StoryMediaType } | null {
  if (isVideoFile(value)) {
    return { file: value, mediaType: "VIDEO" };
  }
  if (isImageFile(value)) {
    return { file: value, mediaType: "IMAGE" };
  }
  return null;
}

export async function saveStoryVideo(file: File, duration: number): Promise<string> {
  return saveStoryMedia(file, "VIDEO", duration);
}

export async function saveStoryMedia(
  file: File,
  mediaType: StoryMediaType,
  duration: number,
): Promise<string> {
  const extension =
    mediaType === "IMAGE" ? IMAGE_EXTENSION[file.type] : VIDEO_EXTENSION[file.type];
  if (!extension) {
    throw new Error(mediaType === "IMAGE" ? "Use a JPG, PNG, or WEBP image." : "Use an MP4, WEBM, or MOV video.");
  }
  const maxBytes = mediaType === "IMAGE" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  if (file.size > maxBytes) {
    throw new Error(mediaType === "IMAGE" ? "Image must be 8 MB or smaller." : "Video must be 20 MB or smaller.");
  }
  if (mediaType === "VIDEO") {
    if (!Number.isFinite(duration) || duration <= 0 || duration > STORY_MAX_SECONDS) {
      throw new Error(`Video must be ${STORY_MAX_SECONDS} seconds or shorter.`);
    }
  }

  const directory = path.join(process.cwd(), "public", "uploads", "stories");
  await mkdir(directory, { recursive: true });
  const filename = `${randomUUID()}.${extension}`;
  await writeFile(path.join(directory, filename), Buffer.from(await file.arrayBuffer()));
  return `/uploads/stories/${filename}`;
}

export function defaultMediaDuration(mediaType: StoryMediaType, duration: number): number {
  if (mediaType === "IMAGE") {
    return STORY_IMAGE_SECONDS;
  }
  return duration;
}

export async function deleteStoryVideo(videoUrl: string | null | undefined): Promise<void> {
  const relative = videoUrl?.trim();
  if (!relative || !relative.startsWith("/uploads/stories/")) {
    return;
  }
  const filename = path.basename(relative);
  if (!filename || filename.includes("..")) {
    return;
  }
  try {
    await unlink(path.join(process.cwd(), "public", "uploads", "stories", filename));
  } catch {
    // File may already be gone.
  }
}
