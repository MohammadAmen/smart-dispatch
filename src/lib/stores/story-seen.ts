import type { PublicStoryStore } from "@/lib/stores/story-types";

export const STORY_SEEN_KEY = "sd-story-seen-v1";

export function readSeenStoryIds(): string[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(STORY_SEEN_KEY);
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.flatMap((value) => (typeof value === "string" && value.trim() ? [value] : []));
  } catch {
    return [];
  }
}

export function writeSeenStoryIds(ids: string[]): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(STORY_SEEN_KEY, JSON.stringify([...new Set(ids)]));
  } catch {
    // Private mode can block storage.
  }
}

export function isStoreAllSeen(store: PublicStoryStore, viewedIds: ReadonlySet<string>): boolean {
  const active = store.stories.filter((story) => Date.parse(story.expiresAt) > Date.now());
  return active.length > 0 && active.every((story) => viewedIds.has(story.id));
}

export function firstUnseenStoryIndex(
  store: PublicStoryStore,
  viewedIds: ReadonlySet<string>,
): number {
  const index = store.stories.findIndex(
    (story) => Date.parse(story.expiresAt) > Date.now() && !viewedIds.has(story.id),
  );
  return index >= 0 ? index : 0;
}

export function sortStoryStores(
  stores: PublicStoryStore[],
  viewedIds: ReadonlySet<string>,
): PublicStoryStore[] {
  return [...stores].sort((left, right) => {
    const leftSeen = isStoreAllSeen(left, viewedIds);
    const rightSeen = isStoreAllSeen(right, viewedIds);
    if (leftSeen !== rightSeen) {
      return leftSeen ? 1 : -1;
    }
    return Date.parse(right.latestAt) - Date.parse(left.latestAt);
  });
}
