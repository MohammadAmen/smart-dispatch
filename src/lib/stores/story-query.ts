import { mutate } from "swr";

import { readStoryGuestKey } from "@/lib/stores/story-guest";
import type { PublicStory, PublicStoryStore } from "@/lib/stores/story-types";

export const ACTIVE_STORIES_KEY = "/api/stories/active";
const STORIES_CHANNEL = "sd-albal-stories";

export async function fetchActiveStories(): Promise<PublicStoryStore[]> {
  const response = await fetch(ACTIVE_STORIES_KEY, {
    cache: "no-store",
    headers: { "x-story-guest": readStoryGuestKey() },
  });
  const body = (await response.json()) as { ok?: boolean; stores?: PublicStoryStore[] };
  if (!body.ok || !Array.isArray(body.stores)) {
    throw new Error("Could not load stories.");
  }
  return body.stores.filter((store) => store.stories.length > 0);
}

export function patchActiveStory(
  current: PublicStoryStore[] | undefined,
  storyId: string,
  patch: Partial<PublicStory>,
): PublicStoryStore[] {
  return (current ?? []).map((store) => ({
    ...store,
    stories: store.stories.map((story) =>
      story.id === storyId ? { ...story, ...patch } : story,
    ),
  }));
}

export async function invalidateActiveStories(): Promise<void> {
  await mutate(ACTIVE_STORIES_KEY);
  notifyStoriesChanged();
}

export function notifyStoriesChanged(): void {
  try {
    const channel = new BroadcastChannel(STORIES_CHANNEL);
    channel.postMessage("changed");
    channel.close();
  } catch {
    // Private mode or unsupported browsers.
  }
}

export function subscribeStoriesChanged(onChange: () => void): () => void {
  try {
    const channel = new BroadcastChannel(STORIES_CHANNEL);
    channel.onmessage = () => {
      onChange();
    };
    return () => channel.close();
  } catch {
    return () => undefined;
  }
}
