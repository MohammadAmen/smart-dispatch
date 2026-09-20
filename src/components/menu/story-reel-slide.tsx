"use client";

import { AnimatePresence, m } from "framer-motion";
import {
  ChevronDown,
  Eye,
  EyeOff,
  Heart,
  Phone,
  ShoppingBag,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useEffect, useRef, type ReactNode, type RefObject } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { storyActionHref } from "@/lib/stores/story-contact";
import { formatMoney } from "@/lib/stores/pricing";
import type { PublicStory, PublicStoryStore } from "@/lib/stores/story-types";
import { cn } from "@/lib/utils";

export function StoryReelMedia({
  story,
  active,
  muted,
  videoRef,
  onProgress,
  onEnded,
}: {
  story: PublicStory;
  active: boolean;
  muted: boolean;
  videoRef?: RefObject<HTMLVideoElement | null>;
  onProgress: (value: number) => void;
  onEnded: () => void;
}): ReactNode {
  const localRef = useRef<HTMLVideoElement | null>(null);
  const nodeRef = videoRef ?? localRef;

  useEffect(() => {
    const node = nodeRef.current;
    if (!node || story.mediaType !== "VIDEO") {
      return;
    }
    if (!active) {
      node.pause();
      return;
    }
    node.muted = muted;
    void node.play().catch(() => {
      node.muted = true;
      void node.play().catch(() => undefined);
    });
  }, [active, muted, nodeRef, story.id, story.mediaType]);

  if (story.mediaType === "IMAGE") {
    return (
      <div className="absolute inset-0 overflow-hidden bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={story.videoUrl}
          alt=""
          className={cn("size-full object-cover", active && "albal-ken-burns")}
        />
      </div>
    );
  }

  return (
    <video
      key={story.id}
      ref={nodeRef}
      src={active ? story.videoUrl : undefined}
      className="absolute inset-0 size-full object-cover"
      autoPlay={active}
      muted={muted}
      playsInline
      preload={active ? "auto" : "none"}
      onTimeUpdate={(event) => {
        const node = event.currentTarget;
        onProgress(node.duration > 0 ? node.currentTime / node.duration : 0);
      }}
      onEnded={onEnded}
    />
  );
}

export function StoryReelOverlay({
  store,
  story,
  progress,
  muted,
  showText,
  added,
  onMute,
  onClose,
  onLike,
  onToggleText,
  onStoreOpen,
  onOrder,
}: {
  store: PublicStoryStore;
  story: PublicStory;
  progress: number;
  muted: boolean;
  showText: boolean;
  added: boolean;
  onMute: () => void;
  onClose: () => void;
  onLike: () => void;
  onToggleText: () => void;
  onStoreOpen?: () => void;
  onOrder: () => void;
}): ReactNode {
  const { t } = useLocale();
  const actionHref = story.isAdminAd ? storyActionHref(story) : null;
  const headerName = store.isAdminAd ? t("menu.sponsoredName") : store.storeName;

  return (
    <>
      <div className="absolute inset-0 bg-linear-to-b from-black/45 via-transparent to-black/70" />

      <div className="relative z-20 px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex gap-1">
          {store.stories.map((item, index) => {
            const current = item.id === story.id;
            const past = store.stories.findIndex((entry) => entry.id === story.id) > index;
            return (
              <span key={item.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
                <span
                  className="block h-full bg-white transition-[width] duration-100"
                  style={{
                    width: past ? "100%" : current ? `${Math.min(100, progress * 100)}%` : "0%",
                  }}
                />
              </span>
            );
          })}
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={store.isAdminAd ? undefined : onStoreOpen}
            disabled={store.isAdminAd}
            className="flex min-w-0 items-center gap-2 text-start"
            aria-label={store.isAdminAd ? t("menu.sponsoredBadge") : t("menu.storeInfo")}
          >
            <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/20 ring-2 ring-white/50 shadow-lg shadow-black/30">
              {store.isAdminAd ? (
                <Sparkles className="size-4 text-amber-200" />
              ) : store.storeLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={store.storeLogoUrl} alt="" className="size-full object-cover" />
              ) : (
                <span className="text-[11px] font-semibold text-white">{headerName.slice(0, 1)}</span>
              )}
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-0.5">
                <p className="truncate text-sm font-semibold text-white">{headerName}</p>
                {store.isAdminAd ? null : <ChevronDown className="size-3.5 shrink-0 text-white/75" />}
              </span>
              {store.isAdminAd ? (
                <span className="text-[10px] font-semibold text-amber-200">{t("menu.sponsoredBadge")}</span>
              ) : null}
            </span>
          </button>
          <div className="flex items-center gap-1">
            {story.mediaType === "VIDEO" ? (
              <button
                type="button"
                onClick={onMute}
                className="inline-flex size-8 items-center justify-center rounded-full bg-white/15 text-white"
                aria-label={muted ? t("menu.storyUnmute") : t("menu.storyMute")}
              >
                {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex size-8 items-center justify-center rounded-full bg-white/15 text-white"
              aria-label={t("common.close")}
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="absolute end-3 top-1/2 z-20 flex -translate-y-1/2 flex-col items-center gap-4 text-white">
        <button type="button" onClick={onLike} className="flex flex-col items-center gap-1" aria-label={t("menu.storyLike")}>
          <span
            className={cn(
              "inline-flex size-11 items-center justify-center rounded-full bg-white/15",
              story.liked && "bg-rose-500/90 shadow-lg shadow-rose-500/40",
            )}
          >
            <Heart className={cn("size-5", story.liked && "fill-current")} />
          </span>
          <span className="text-[11px] font-semibold">{story.likesCount}</span>
        </button>
        <div className="flex flex-col items-center gap-1 text-[11px] font-semibold">
          <Eye className="size-5 opacity-80" />
          {story.viewsCount}
        </div>
        <button
          type="button"
          onClick={onToggleText}
          className="inline-flex size-11 items-center justify-center rounded-full bg-white/15"
          aria-label={t("menu.storyToggleText")}
        >
          {showText ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
        </button>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-20 space-y-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <AnimatePresence>
          {showText ? (
            <m.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="max-w-[78%] space-y-1 text-white"
            >
              <p className="text-xs font-semibold text-white/80">{headerName}</p>
              <h2 className="font-heading text-lg font-semibold">{story.title}</h2>
              {story.description ? (
                <p className="text-sm leading-relaxed text-white/85">{story.description}</p>
              ) : null}
            </m.div>
          ) : null}
        </AnimatePresence>
        {story.isAdminAd && actionHref ? (
          <a
            href={actionHref}
            target="_blank"
            rel="noreferrer"
            className="brand-sheen inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30"
          >
            <Phone className="size-4" />
            {story.actionType === "EXTERNAL_LINK" ? t("menu.openLink") : t("menu.contactUs")}
          </a>
        ) : null}
        {!story.isAdminAd && story.isOrderable ? (
          <button
            type="button"
            onClick={onOrder}
            className="brand-sheen inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30"
          >
            <ShoppingBag className="size-4" />
            {added
              ? t("menu.storyAdded")
              : story.price != null
                ? `${t("menu.storyOrderNow")} · ${formatMoney(story.price)} ${t("menu.currency")}`
                : t("menu.storyOrderNow")}
          </button>
        ) : null}
      </div>
    </>
  );
}
