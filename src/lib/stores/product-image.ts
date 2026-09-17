import "server-only";

import { persistUpload, type UploadFolder } from "@/lib/uploads";

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
  folder: Exclude<UploadFolder, "stories">,
): Promise<string> {
  const extension = EXTENSION_BY_TYPE[file.type];
  if (!extension) {
    throw new Error("Use a JPG, PNG, WEBP, or GIF image.");
  }

  if (file.size > MAX_BYTES) {
    throw new Error("Image must be 4 MB or smaller.");
  }

  try {
    return await persistUpload({
      folder,
      mimeType: file.type,
      bytes: new Uint8Array(await file.arrayBuffer()),
    });
  } catch {
    throw new Error("Could not save the image. Try a smaller JPG or PNG.");
  }
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
