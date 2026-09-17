"use client";

import { AnimatePresence, m } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";

import { StoryReelMedia, StoryReelOverlay } from "@/components/menu/story-reel-slide";
import { baseCartExtras } from "@/lib/stores/menu-cart";
import { flattenStoryFeed, firstUnseenFeedIndex } from "@/lib/stores/story-feed";
import { readStoryGuestKey } from "@/lib/stores/story-guest";
import { storyDurationMs, type PublicStory, type PublicStoryStore } from "@/lib/stores/story-types";
import { useMenuCartStore } from "@/stores/menu-cart-store";
import { useStorySeenStore } from "@/stores/story-seen-store";

const SWIPE_THRESHOLD = 72;

export function StoryFeedModal({
  stores,
  onClose,
  onStoryPatch,
}: {
  stores: PublicStoryStore[];
  onClose: () => void;
  onStoryPatch: (storyId: string, patch: Partial<PublicStory>) => void;
}): ReactNode {
  const add = useMenuCartStore((state) => state.add);
  const markSeen = useStorySeenStore((state) => state.markSeen);
  const orderRef = useRef<string[] | null>(null);
  if (!orderRef.current) {
    orderRef.current = flattenStoryFeed(
      stores,
      new Set(useStorySeenStore.getState().viewedIds),
    ).map((entry) => entry.story.id);
  }
  const items = useMemo(() => {
    const order = orderRef.current ?? [];
    return order.flatMap((storyId) => {
      for (const store of stores) {
        const story = store.stories.find((entry) => entry.id === storyId);
        if (story) {
          return [{ store, story }];
        }
      }
      return [];
    });
  }, [stores]);
  const [index, setIndex] = useState(() =>
    firstUnseenFeedIndex(flattenStoryFeed(stores, new Set(useStorySeenStore.getState().viewedIds)), new Set(useStorySeenStore.getState().viewedIds)),
  );
  const [dragY, setDragY] = useState(0);
  const [progress, setProgress] = useState(0);
  const [muted, setMuted] = useState(false);
  const [showText, setShowText] = useState(true);
  const [added, setAdded] = useState(false);
  const dragging = useRef(false);
  const startY = useRef(0);
  const viewed = useRef(new Set<string>());
  const item = items[index] ?? null;

  const go = useCallback(
    (next: number): void => {
      if (next < 0 || next >= items.length) {
        if (next >= items.length) {
          onClose();
        }
        return;
      }
      setIndex(next);
      setProgress(0);
      setAdded(false);
      setDragY(0);
    },
    [items.length, onClose],
  );

  useEffect(() => {
    if (!item) {
      return;
    }
    if (viewed.current.has(item.story.id)) {
      return;
    }
    viewed.current.add(item.story.id);
    markSeen(item.story.id);
    onStoryPatch(item.story.id, { viewsCount: item.story.viewsCount + 1 });
    void fetch(`/api/stories/${item.story.id}/view`, { method: "POST" })
      .then((response) => response.json())
      .then((body: { ok?: boolean; viewsCount?: number }) => {
        if (body.ok && typeof body.viewsCount === "number") {
          onStoryPatch(item.story.id, { viewsCount: body.viewsCount });
        }
      })
      .catch(() => undefined);
  }, [item, markSeen, onStoryPatch]);

  useEffect(() => {
    if (!item || item.story.mediaType !== "IMAGE") {
      return;
    }
    const started = Date.now();
    const total = storyDurationMs(item.story);
    const tick = window.setInterval(() => {
      const ratio = Math.min(1, (Date.now() - started) / total);
      setProgress(ratio);
      if (ratio >= 1) {
        window.clearInterval(tick);
        go(index + 1);
      }
    }, 50);
    return () => window.clearInterval(tick);
  }, [go, index, item]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if ((event.target as HTMLElement).closest("button, a")) {
      return;
    }
    dragging.current = true;
    startY.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (!dragging.current) {
      return;
    }
    setDragY(event.clientY - startY.current);
  };

  const onPointerUp = (): void => {
    if (!dragging.current) {
      return;
    }
    dragging.current = false;
    if (dragY < -SWIPE_THRESHOLD) {
      go(index + 1);
      return;
    }
    if (dragY > SWIPE_THRESHOLD) {
      go(index - 1);
      return;
    }
    setDragY(0);
  };

  const toggleLike = async (): Promise<void> => {
    if (!item) {
      return;
    }
    const previous = { liked: item.story.liked, likesCount: item.story.likesCount };
    onStoryPatch(item.story.id, {
      liked: !item.story.liked,
      likesCount: item.story.likesCount + (item.story.liked ? -1 : 1),
    });
    try {
      const response = await fetch(`/api/stories/${item.story.id}/like`, {
        method: "POST",
        headers: { "x-story-guest": readStoryGuestKey() },
      });
      const body = (await response.json()) as { ok?: boolean; liked?: boolean; likesCount?: number };
      if (!body.ok || body.liked == null || body.likesCount == null) {
        onStoryPatch(item.story.id, previous);
        return;
      }
      onStoryPatch(item.story.id, { liked: body.liked, likesCount: body.likesCount });
    } catch {
      onStoryPatch(item.story.id, previous);
    }
  };

  const orderNow = (): void => {
    if (!item?.story.isOrderable) {
      return;
    }
    if (item.story.productId && item.story.productName && item.story.price != null) {
      add({
        ...baseCartExtras(item.story.productId),
        productId: item.story.productId,
        storeId: item.story.storeId,
        storeName: item.story.storeName,
        storeLogoUrl: item.story.storeLogoUrl,
        storeLat: item.story.storeLat,
        storeLng: item.story.storeLng,
        name: item.story.productName,
        price: item.story.price,
        imageUrl: item.story.productImage,
      });
      setAdded(true);
    }
  };

  if (!item) {
    return null;
  }

  const windowIndexes = [index - 1, index, index + 1].filter((value) => value >= 0 && value < items.length);

  return (
    <AnimatePresence>
      <m.div
        className="fixed inset-0 z-[70] overflow-hidden bg-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {windowIndexes.map((itemIndex) => {
          const entry = items[itemIndex];
          const offset = (itemIndex - index) * 100;
          return (
            <div
              key={entry.story.id}
              className="absolute inset-0 will-change-transform"
              style={{
                transform: `translate3d(0, calc(${offset}dvh + ${itemIndex === index ? dragY : 0}px), 0)`,
                transition: dragging.current ? "none" : "transform 280ms cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            >
              <StoryReelMedia
                story={entry.story}
                active={itemIndex === index}
                muted={muted}
                onProgress={itemIndex === index ? setProgress : () => undefined}
                onEnded={() => {
                  if (itemIndex === index) {
                    go(index + 1);
                  }
                }}
              />
              {itemIndex === index ? (
                <StoryReelOverlay
                  store={{ ...entry.store, stories: [entry.story] }}
                  story={entry.story}
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
                  onOrder={orderNow}
                />
              ) : null}
            </div>
          );
        })}
      </m.div>
    </AnimatePresence>
  );
}
