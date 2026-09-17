import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const MAX_BYTES = 4 * 1024 * 1024;

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export function isImageFile(value: FormDataEntryValue | null): value is File {
  return typeof File !== "undefined" && value instanceof File && value.size > 0;
}

export async function saveUploadedImage(
  file: File,
  folder: "products" | "stores" | "offers" | "custom",
): Promise<string> {
  const extension = EXTENSION_BY_TYPE[file.type];
  if (!extension) {
    throw new Error("Use a JPG, PNG, WEBP, or GIF image.");
  }

  if (file.size > MAX_BYTES) {
    throw new Error("Image must be 4 MB or smaller.");
  }

  const directory = path.join(process.cwd(), "public", "uploads", folder);
  await mkdir(directory, { recursive: true });

  const filename = `${randomUUID()}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(directory, filename), buffer);

  return `/uploads/${folder}/${filename}`;
}

export async function saveProductImage(file: File): Promise<string> {
  return saveUploadedImage(file, "products");
}

export async function saveStoreImage(file: File): Promise<string> {
  return saveUploadedImage(file, "stores");
}

export async function saveOfferImage(file: File): Promise<string> {
  return saveUploadedImage(file, "offers");
}

export async function saveCustomOrderImage(file: File): Promise<string> {
  return saveUploadedImage(file, "custom");
}
