"use client";

import jsQR from "jsqr";

type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>
};

function getBarcodeDetector(): BarcodeDetectorLike | null {
  const Ctor = (
    globalThis as typeof globalThis & {
      BarcodeDetector?: new (options?: { formats?: string[] }) => BarcodeDetectorLike
    }
  ).BarcodeDetector;
  if (!Ctor) {
    return null;
  }
  try {
    return new Ctor({ formats: ["qr_code"] });
  } catch {
    return null;
  }
}

/** Decode a QR payload from an image File / Blob (fallback path). */
export async function decodeQrFromImageFile(file: Blob): Promise<string | null> {
  const bitmap = await createImageBitmap(file);
  try {
    const detector = getBarcodeDetector();
    if (detector) {
      const codes = await detector.detect(bitmap);
      const value = codes[0]?.rawValue?.trim();
      if (value) {
        return value;
      }
    }
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

/**
 * Decode QR from a live video frame.
 * Downscales large frames for faster jsQR on mobile WebViews.
 */
export function decodeQrFromVideo(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
): string | null {
  if (video.readyState < 2 || video.videoWidth < 8) {
    return null;
  }
  const srcW = video.videoWidth;
  const srcH = video.videoHeight;
  const maxSide = 720;
  const scale = Math.min(1, maxSide / Math.max(srcW, srcH));
  const w = Math.max(8, Math.round(srcW * scale));
  const h = Math.max(8, Math.round(srcH * scale));
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return null;
  }
  ctx.drawImage(video, 0, 0, w, h);
  const image = ctx.getImageData(0, 0, w, h);
  const result = jsQR(image.data, image.width, image.height, {
    inversionAttempts: "dontInvert",
  });
  if (result?.data?.trim()) {
    return result.data.trim();
  }
  // Second pass with inversion if needed (dark-on-light screens).
  const inverted = jsQR(image.data, image.width, image.height, {
    inversionAttempts: "onlyInvert",
  });
  return inverted?.data?.trim() || null;
}

/** Native BarcodeDetector path when the browser supports it (Chromium). */
export async function decodeQrFromVideoDetector(
  video: HTMLVideoElement,
): Promise<string | null> {
  const detector = getBarcodeDetector();
  if (!detector || video.readyState < 2) {
    return null;
  }
  try {
    const codes = await detector.detect(video);
    return codes[0]?.rawValue?.trim() || null;
  } catch {
    return null;
  }
}
