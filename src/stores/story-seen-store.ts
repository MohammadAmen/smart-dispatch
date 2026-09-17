"use client";

import { create } from "zustand";

import { readSeenStoryIds, writeSeenStoryIds } from "@/lib/stores/story-seen";

interface StorySeenState {
  viewedIds: string[];
  hydrated: boolean;
  hydrate: () => void;
  markSeen: (storyId: string) => void;
}

export const useStorySeenStore = create<StorySeenState>()((set, get) => ({
  viewedIds: [],
  hydrated: false,
  hydrate: () => {
    set({ viewedIds: readSeenStoryIds(), hydrated: true });
  },
  markSeen: (storyId) => {
    const id = storyId.trim();
    if (!id) {
      return;
    }
    const current = get().viewedIds;
    if (current.includes(id)) {
      return;
    }
    const viewedIds = [...current, id];
    writeSeenStoryIds(viewedIds);
    set({ viewedIds, hydrated: true });
  },
}));
