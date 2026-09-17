"use client";

import { AnimatePresence, m } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { StoryReelMedia, StoryReelOverlay } from "@/components/menu/story-reel-slide";
import { useLocale } from "@/components/providers/locale-provider";
import { readStoryGuestKey } from "@/lib/stores/story-guest";
import { firstUnseenStoryIndex } from "@/lib/stores/story-seen";
import { baseCartExtras } from "@/lib/stores/menu-cart";
import { storyDurationMs, type PublicStory, type PublicStoryStore } from "@/lib/stores/story-types";
import { useMenuCartStore } from "@/stores/menu-cart-store";
import { useStorySeenStore } from "@/stores/story-seen-store";

const StoreInfoSheet = dynamic(
  () => import("@/components/menu/store-info-sheet").then((mod) => mod.StoreInfoSheet),
  { ssr: false },
);

export function StoryReelsModal({
  stores,
  startStoreId,
  onClose,
  onStoryPatch,
}: {
  stores: PublicStoryStore[];
  startStoreId: string;
  onClose: () => void;
  onStoryPatch: (storyId: string, patch: Partial<PublicStory>) => void;
}): ReactNode {
  const { t } = useLocale();
  const router = useRouter();
  const add = useMenuCartStore((state) => state.add);
  const markSeen = useStorySeenStore((state) => state.markSeen);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const viewed = useRef(new Set<string>());
  const startStore = stores.find((item) => item.storeId === startStoreId) ?? stores[0];
  const [currentStoreId, setCurrentStoreId] = useState(startStore?.storeId ?? startStoreId);
  const [storyIndex, setStoryIndex] = useState(() =>
    startStore ? firstUnseenStoryIndex(startStore, new Set(useStorySeenStore.getState().viewedIds)) : 0,
  );
  const [progress, setProgress] = useState(0);
  const [muted, setMuted] = useState(false);
  const [showText, setShowText] = useState(true);
  const [added, setAdded] = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);

  const storeIndex = stores.findIndex((item) => item.storeId === currentStoreId);
  const store = storeIndex >= 0 ? stores[storeIndex] : null;
  const story = store?.stories[storyIndex] ?? store?.stories[0] ?? null;

  useEffect(() => {
    const nextStore = stores.find((item) => item.storeId === currentStoreId);
    const seen = new Set(useStorySeenStore.getState().viewedIds);
    setStoryIndex(nextStore ? firstUnseenStoryIndex(nextStore, seen) : 0);
    setProgress(0);
    setAdded(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStoreId]);

  useEffect(() => {
    setProgress(0);
    setAdded(false);
    setMuted(false);
  }, [story?.id]);

  useEffect(() => {
    if (!story || story.mediaType !== "IMAGE" || storeOpen) {
      return;
    }
    const started = Date.now();
    const total = storyDurationMs(story);
    const tick = window.setInterval(() => {
      const ratio = Math.min(1, (Date.now() - started) / total);
      setProgress(ratio);
      if (ratio >= 1) {
        window.clearInterval(tick);
        goStory(storyIndex + 1);
      }
    }, 50);
    return () => window.clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.id, storeOpen]);

  useEffect(() => {
    if (!story) {
      return;
    }
    if (viewed.current.has(story.id)) {
      return;
    }
    viewed.current.add(story.id);
    markSeen(story.id);
    onStoryPatch(story.id, { viewsCount: story.viewsCount + 1 });
    void fetch(`/api/stories/${story.id}/view`, { method: "POST" })
      .then((response) => response.json())
      .then((body: { ok?: boolean; viewsCount?: number }) => {
        if (body.ok && typeof body.viewsCount === "number") {
          onStoryPatch(story.id, { viewsCount: body.viewsCount });
        }
      })
      .catch(() => undefined);
  }, [markSeen, onStoryPatch, story]);

  const goStory = (next: number): void => {
    if (!store) {
      return;
    }
    if (next < 0) {
      if (storeIndex > 0) {
        setCurrentStoreId(stores[storeIndex - 1].storeId);
      }
      return;
    }
    if (next >= store.stories.length) {
      if (storeIndex >= 0 && storeIndex < stores.length - 1) {
        setCurrentStoreId(stores[storeIndex + 1].storeId);
        return;
      }
      onClose();
      return;
    }
    setStoryIndex(next);
  };

  const toggleLike = async (): Promise<void> => {
    if (!story) {
      return;
    }
    const previous = { liked: story.liked, likesCount: story.likesCount };
    onStoryPatch(story.id, {
      liked: !story.liked,
      likesCount: story.likesCount + (story.liked ? -1 : 1),
    });
    try {
      const response = await fetch(`/api/stories/${story.id}/like`, {
        method: "POST",
        headers: { "x-story-guest": readStoryGuestKey() },
      });
      const body = (await response.json()) as {
        ok?: boolean;
        liked?: boolean;
        likesCount?: number;
      };
      if (!body.ok || body.liked == null || body.likesCount == null) {
        onStoryPatch(story.id, previous);
        return;
      }
      onStoryPatch(story.id, { liked: body.liked, likesCount: body.likesCount });
    } catch {
      onStoryPatch(story.id, previous);
    }
  };

  const orderNow = (): void => {
    if (!story?.isOrderable) {
      return;
    }
    if (story.productId && story.productName && story.price != null) {
      add({
        ...baseCartExtras(story.productId),
        productId: story.productId,
        storeId: story.storeId,
        storeName: story.storeName,
        storeLogoUrl: story.storeLogoUrl,
        storeLat: story.storeLat,
        storeLng: story.storeLng,
        name: story.productName,
        price: story.price,
        imageUrl: story.productImage,
      });
      setAdded(true);
      return;
    }
    onClose();
    router.push(`/menu/stores/${story.storeId}`);
  };

  if (!store || !story) {
    return null;
  }

  return (
    <AnimatePresence>
      <m.div
        className="fixed inset-0 z-[70] bg-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <StoryReelMedia
          story={story}
          active={!storeOpen}
          muted={muted}
          videoRef={videoRef}
          onProgress={setProgress}
          onEnded={() => goStory(storyIndex + 1)}
        />

        <button
          type="button"
          className="absolute inset-y-0 start-0 z-10 w-1/3"
          aria-label={t("menu.storyPrev")}
          onClick={() => goStory(storyIndex - 1)}
        />
        <button
          type="button"
          className="absolute inset-y-0 end-0 z-10 w-1/3"
          aria-label={t("menu.storyNext")}
          onClick={() => goStory(storyIndex + 1)}
        />

        <StoryReelOverlay
          store={store}
          story={story}
          progress={progress}
          muted={muted}
          showText={showText}
          added={added}
          onMute={() => setMuted((value) => !value)}
          onClose={onClose}
          onLike={() => {
            void toggleLike();
          }}
          onToggleText={() => setShowText((value) => !value)}
          onStoreOpen={() => setStoreOpen(true)}
          onOrder={orderNow}
        />

        {storeIndex > 0 ? (
          <ChevronLeft className="pointer-events-none absolute start-2 top-1/2 z-10 size-5 -translate-y-1/2 text-white/40" />
        ) : null}
        {storeIndex < stores.length - 1 || storyIndex < store.stories.length - 1 ? (
          <ChevronRight className="pointer-events-none absolute end-2 top-1/2 z-10 size-5 -translate-y-1/2 text-white/40" />
        ) : null}

        {store.isAdminAd ? null : (
          <StoreInfoSheet
            open={storeOpen}
            store={store}
            onClose={() => setStoreOpen(false)}
            onOpenMenu={onClose}
          />
        )}
      </m.div>
    </AnimatePresence>
  );
}
