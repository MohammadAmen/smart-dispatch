import { STORY_GUEST_KEY } from "@/lib/stores/story-types";

export function readStoryGuestKey(): string {
  if (typeof window === "undefined") {
    return "";
  }
  try {
    const existing = window.localStorage.getItem(STORY_GUEST_KEY)?.trim();
    if (existing) {
      return existing;
    }
    const next = crypto.randomUUID();
    window.localStorage.setItem(STORY_GUEST_KEY, next);
    return next;
  } catch {
    return "anon";
  }
}
