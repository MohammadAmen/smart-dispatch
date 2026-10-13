"use client";

import jsQR from "jsqr";

/** Decode a QR payload from an image File / Blob (works in Capacitor WebViews). */
export async function decodeQrFromImageFile(file: Blob): Promise<string | null> {
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      return null;
    }
    ctx.drawImage(bitmap, 0, 0);
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const result = jsQR(image.data, image.width, image.height, {
      inversionAttempts: "attemptBoth",
    });
    return result?.data?.trim() || null;
  } finally {
    bitmap.close();
  }
}

/** Decode QR from a video frame via canvas + jsQR. */
export function decodeQrFromVideo(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
): string | null {
  if (video.readyState < 2 || video.videoWidth < 8) {
    return null;
  }
  const w = video.videoWidth;
  const h = video.videoHeight;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return null;
  }
  ctx.drawImage(video, 0, 0, w, h);
  const image = ctx.getImageData(0, 0, w, h);
  const result = jsQR(image.data, image.width, image.height, {
    inversionAttempts: "attemptBoth",
  });
  return result?.data?.trim() || null;
}
