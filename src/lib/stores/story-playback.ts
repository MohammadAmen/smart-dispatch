"use client";

/**
 * Ensures only one story/reel video can produce sound or play at a time.
 * Adjacent slides may preload, but they stay paused and muted until claimed.
 */
let activeVideo: HTMLVideoElement | null = null;

export function claimStoryVideo(node: HTMLVideoElement): void {
  if (activeVideo && activeVideo !== node) {
    silenceStoryVideo(activeVideo);
  }
  activeVideo = node;
}

export function releaseStoryVideo(node: HTMLVideoElement): void {
  if (activeVideo === node) {
    activeVideo = null;
  }
}

export function silenceStoryVideo(node: HTMLVideoElement): void {
  try {
    node.pause();
    node.muted = true;
    node.volume = 0;
  } catch {
    // Some WebViews reject pause during teardown.
  }
}

export function preloadStoryMedia(url: string | null | undefined): void {
  const href = url?.trim();
  if (!href || typeof document === "undefined") {
    return;
  }

  const links = document.head.querySelectorAll("link[data-story-preload]");
  for (const node of links) {
    if (node.getAttribute("data-story-preload") === href) {
      return;
    }
  }

  const link = document.createElement("link");
  link.rel = "preload";
  link.as = /\.(png|jpe?g|webp|gif)(\?|$)/i.test(href) ? "image" : "fetch";
  link.href = href;
  link.crossOrigin = "anonymous";
  link.setAttribute("data-story-preload", href);
  document.head.appendChild(link);
}
