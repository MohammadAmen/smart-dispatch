import { isStoreAllSeen } from "@/lib/stores/story-seen";
import type { PublicStory, PublicStoryStore } from "@/lib/stores/story-types";

export interface StoryFeedItem {
  store: PublicStoryStore;
  story: PublicStory;
}

export function flattenStoryFeed(
  stores: PublicStoryStore[],
  viewedIds: ReadonlySet<string>,
): StoryFeedItem[] {
  const items = stores.flatMap((store) =>
    store.stories
      .filter((story) => Date.parse(story.expiresAt) > Date.now())
      .map((story) => ({ store, story })),
  );

  return items.sort((left, right) => {
    const leftSeen = viewedIds.has(left.story.id);
    const rightSeen = viewedIds.has(right.story.id);
    if (leftSeen !== rightSeen) {
      return leftSeen ? 1 : -1;
    }
    return Date.parse(right.story.createdAt) - Date.parse(left.story.createdAt);
  });
}

export function firstUnseenFeedIndex(
  items: StoryFeedItem[],
  viewedIds: ReadonlySet<string>,
): number {
  const index = items.findIndex((item) => !viewedIds.has(item.story.id));
  return index >= 0 ? index : 0;
}

export function sortRailStores(
  stores: PublicStoryStore[],
  viewedIds: ReadonlySet<string>,
): PublicStoryStore[] {
  return [...stores].sort((left, right) => {
    if (left.isAdminAd !== right.isAdminAd) {
      return left.isAdminAd ? -1 : 1;
    }
    const leftSeen = isStoreAllSeen(left, viewedIds);
    const rightSeen = isStoreAllSeen(right, viewedIds);
    if (leftSeen !== rightSeen) {
      return leftSeen ? 1 : -1;
    }
    return Date.parse(right.latestAt) - Date.parse(left.latestAt);
  });
}
