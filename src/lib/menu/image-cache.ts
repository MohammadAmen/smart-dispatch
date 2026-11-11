"use client";

/** URLs already decoded this session — skip shimmer on remount. */
const loadedUrls = new Set<string>();
const inflight = new Map<string, Promise<void>>();

export function isMenuImageReady(url: string | null | undefined): boolean {
  const clean = url?.trim();
  return Boolean(clean && loadedUrls.has(clean));
}

export function markMenuImageReady(url: string): void {
  const clean = url.trim();
  if (clean) {
    loadedUrls.add(clean);
  }
}

/** Warm the browser HTTP cache + in-memory ready set. */
export function prefetchMenuImage(url: string | null | undefined): Promise<void> {
  const clean = url?.trim();
  if (!clean || typeof window === "undefined") {
    return Promise.resolve();
  }
  if (loadedUrls.has(clean)) {
    return Promise.resolve();
  }
  const existing = inflight.get(clean);
  if (existing) {
    return existing;
  }

  const job = new Promise<void>((resolve) => {
    const img = new window.Image();
    img.decoding = "async";
    img.onload = () => {
      loadedUrls.add(clean);
      inflight.delete(clean);
      resolve();
    };
    img.onerror = () => {
      inflight.delete(clean);
      resolve();
    };
    img.src = clean;
  });
  inflight.set(clean, job);
  return job;
}

export function prefetchMenuImages(
  urls: Array<string | null | undefined>,
  limit = 24,
): void {
  const unique = [...new Set(urls.map((url) => url?.trim()).filter(Boolean))] as string[];
  for (const url of unique.slice(0, Math.max(0, limit))) {
    void prefetchMenuImage(url);
  }
}
