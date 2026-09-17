"use client";

import { Lightbulb, Sparkles } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import useSWR from "swr";

const StoryReelsModal = dynamic(
  () => import("@/components/menu/story-reels-modal").then((mod) => mod.StoryReelsModal),
  { ssr: false },
);
const StoryFeedModal = dynamic(
  () => import("@/components/menu/story-feed-modal").then((mod) => mod.StoryFeedModal),
  { ssr: false },
);
import { useLocale } from "@/components/providers/locale-provider";
import { sortRailStores } from "@/lib/stores/story-feed";
import {
  ACTIVE_STORIES_KEY,
  fetchActiveStories,
  patchActiveStory,
  subscribeStoriesChanged,
} from "@/lib/stores/story-query";
import { isStoreAllSeen } from "@/lib/stores/story-seen";
import type { PublicStory } from "@/lib/stores/story-types";
import { cn } from "@/lib/utils";
import { useStorySeenStore } from "@/stores/story-seen-store";

export function WorthTryingRail({ typeId }: { typeId: string }): ReactNode {
  const { t } = useLocale();
  const viewedIds = useStorySeenStore((state) => state.viewedIds);
  const hydrateSeen = useStorySeenStore((state) => state.hydrate);
  const [openStoreId, setOpenStoreId] = useState<string | null>(null);
  const [feedOpen, setFeedOpen] = useState(false);
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());
  const seenRef = useRef<Map<string, string>>(new Map());
  const primed = useRef(false);

  useEffect(() => {
    hydrateSeen();
  }, [hydrateSeen]);

  const { data: stores = [], mutate } = useSWR(ACTIVE_STORIES_KEY, fetchActiveStories, {
    refreshInterval: 10_000,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    keepPreviousData: true,
  });

  useEffect(() => subscribeStoriesChanged(() => {
    void mutate();
  }), [mutate]);

  const viewedSet = useMemo(() => new Set(viewedIds), [viewedIds]);

  const visible = useMemo(() => {
    const filtered = stores
      .filter((store) => {
        if (typeId !== "all" && !store.isAdminAd && store.storeTypeId !== typeId) {
          return false;
        }
        return store.stories.some((story) => Date.parse(story.expiresAt) > Date.now());
      })
      .map((store) => ({
        ...store,
        stories: store.stories.filter((story) => Date.parse(story.expiresAt) > Date.now()),
      }));
    return sortRailStores(filtered, viewedSet);
  }, [stores, typeId, viewedSet]);

  useEffect(() => {
    if (visible.length === 0) {
      return;
    }

    const nextFresh = new Set<string>();
    for (const store of visible) {
      const previous = seenRef.current.get(store.storeId);
      if (primed.current && previous !== store.latestAt && !isStoreAllSeen(store, viewedSet)) {
        nextFresh.add(store.storeId);
      }
      seenRef.current.set(store.storeId, store.latestAt);
    }
    primed.current = true;

    if (nextFresh.size === 0) {
      return;
    }
    setFreshIds(nextFresh);
    const timer = window.setTimeout(() => setFreshIds(new Set()), 4500);
    return () => window.clearTimeout(timer);
  }, [visible, viewedSet]);

  const patchStory = (storyId: string, patch: Partial<PublicStory>): void => {
    void mutate((current) => patchActiveStory(current, storyId, patch), { revalidate: false });
  };

  if (visible.length === 0) {
    return null;
  }

  return (
    <section className="px-4 pb-1">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Lightbulb className="size-3.5 text-teal-600" />
          <h2 className="text-sm font-semibold">{t("menu.worthTrying")}</h2>
        </div>
        <button
          type="button"
          onClick={() => setFeedOpen(true)}
          className="text-xs font-semibold text-teal-700 dark:text-teal-300"
        >
          {t("menu.viewAll")}
        </button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => setFeedOpen(true)}
          className="flex w-[4.75rem] shrink-0 flex-col items-center gap-1.5 text-center"
        >
          <span className="relative block w-full rounded-full bg-linear-to-tr from-amber-400 via-teal-500 to-cyan-400 p-[3px]">
            <span className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-full bg-background">
              <Sparkles className="size-5 text-teal-600" />
            </span>
          </span>
          <span className="line-clamp-1 text-[11px] font-medium">{t("menu.viewAll")}</span>
        </button>
        {visible.map((store) => {
          const allSeen = isStoreAllSeen(store, viewedSet);
          return (
            <button
              key={store.storeId}
              type="button"
              onClick={() => setOpenStoreId(store.storeId)}
              className={cn(
                "flex w-[4.75rem] shrink-0 flex-col items-center gap-1.5 text-center",
                allSeen && "opacity-60",
              )}
            >
              <span
                className={cn(
                  "relative block w-full rounded-full p-[3px]",
                  store.isAdminAd
                    ? "bg-linear-to-tr from-amber-400 to-teal-500"
                    : allSeen
                      ? "bg-slate-500/35 ring-1 ring-slate-500/40"
                      : "bg-linear-to-tr from-teal-500 to-cyan-400",
                  !allSeen && freshIds.has(store.storeId) && "albal-pulse-glow",
                )}
              >
                {!allSeen && !store.isAdminAd ? (
                  <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
                    <span className="custom-order-story-spin absolute inset-[-45%] bg-[conic-gradient(from_120deg,#14b8a6,#10b981,#22d3ee,#14b8a6)]" />
                  </span>
                ) : null}
                <span className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-full bg-background">
                  {store.isAdminAd ? (
                    <Sparkles className="size-5 text-amber-500" />
                  ) : store.storeLogoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={store.storeLogoUrl} alt="" className="size-full object-cover" />
                  ) : (
                    <span className="text-xs font-semibold text-teal-700">
                      {store.storeName.slice(0, 1)}
                    </span>
                  )}
                </span>
              </span>
              <span className="line-clamp-1 text-[11px] font-medium">
                {store.isAdminAd ? t("menu.sponsoredName") : store.storeName}
              </span>
            </button>
          );
        })}
      </div>

      {openStoreId ? (
        <StoryReelsModal
          stores={visible}
          startStoreId={openStoreId}
          onClose={() => setOpenStoreId(null)}
          onStoryPatch={patchStory}
        />
      ) : null}
      {feedOpen ? (
        <StoryFeedModal
          stores={visible}
          onClose={() => setFeedOpen(false)}
          onStoryPatch={patchStory}
        />
      ) : null}
    </section>
  );
}
