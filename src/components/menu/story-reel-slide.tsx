"use client";

import { AnimatePresence, m } from "framer-motion";
import {
  ChevronDown,
  Eye,
  EyeOff,
  Heart,
  Loader2,
  Phone,
  ShoppingBag,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";

import { StoryBrandMark } from "@/components/menu/story-brand-mark";
import { useLocale } from "@/components/providers/locale-provider";
import { storyActionHref } from "@/lib/stores/story-contact";
import {
  claimStoryVideo,
  preloadStoryMedia,
  releaseStoryVideo,
  silenceStoryVideo,
} from "@/lib/stores/story-playback";
import { formatMoney } from "@/lib/stores/pricing";
import type { PublicStory, PublicStoryStore } from "@/lib/stores/story-types";
import { cn } from "@/lib/utils";

function storyPosterUrl(story: PublicStory): string | null {
  return story.productImage ?? story.storeLogoUrl ?? null;
}

export function StoryReelMedia({
  story,
  active,
  muted,
  preload = false,
  posterUrl: posterOverride,
  videoRef,
  onProgress,
  onEnded,
}: {
  story: PublicStory;
  active: boolean;
  muted: boolean;
  /** Warm the next/prev clip without playing audio. */
  preload?: boolean;
  posterUrl?: string | null;
  videoRef?: RefObject<HTMLVideoElement | null>;
  onProgress: (value: number) => void;
  onEnded: () => void;
}): ReactNode {
  const localRef = useRef<HTMLVideoElement | null>(null);
  const nodeRef = videoRef ?? localRef;
  const mediaUrl = story.videoUrl;
  const posterUrl = posterOverride ?? storyPosterUrl(story);
  const [mediaReady, setMediaReady] = useState(story.mediaType === "IMAGE");

  useEffect(() => {
    setMediaReady(story.mediaType === "IMAGE");
  }, [story.id, story.mediaType]);

  useEffect(() => {
    if ((active || preload) && mediaUrl) {
      preloadStoryMedia(mediaUrl);
    }
  }, [active, mediaUrl, preload]);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node || story.mediaType !== "VIDEO") {
      return;
    }

    if (!active) {
      silenceStoryVideo(node);
      releaseStoryVideo(node);
      try {
        if (node.currentTime > 0.15) {
          node.currentTime = 0;
        }
      } catch {
        // Ignore seek failures on incomplete buffers.
      }
      return;
    }

    claimStoryVideo(node);

    let cancelled = false;

    const tryPlay = (): void => {
      if (cancelled || !active) {
        return;
      }
      node.muted = muted;
      node.volume = muted ? 0 : 1;
      void node.play().catch(() => {
        if (!node.muted) {
          node.muted = true;
          node.volume = 0;
          void node.play().catch(() => undefined);
        }
      });
    };

    const markReady = (): void => {
      setMediaReady(true);
      tryPlay();
    };

    if (node.readyState >= 2) {
      markReady();
    } else {
      const onReady = (): void => {
        markReady();
      };
      node.addEventListener("loadeddata", onReady);
      node.addEventListener("canplay", onReady);
      try {
        if (node.networkState === HTMLMediaElement.NETWORK_EMPTY) {
          node.load();
        }
      } catch {
        // Fast swipes can race load().
      }
      return () => {
        cancelled = true;
        node.removeEventListener("loadeddata", onReady);
        node.removeEventListener("canplay", onReady);
        silenceStoryVideo(node);
        releaseStoryVideo(node);
      };
    }

    return () => {
      cancelled = true;
      silenceStoryVideo(node);
      releaseStoryVideo(node);
    };
  }, [active, nodeRef, story.id, story.mediaType]);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node || !active || story.mediaType !== "VIDEO") {
      return;
    }
    node.muted = muted;
    node.volume = muted ? 0 : 1;
  }, [active, muted, nodeRef, story.mediaType]);

  const loadingOverlay =
    active && !mediaReady ? (
      <div className="absolute inset-0 z-[1] flex items-center justify-center bg-black">
        {posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={posterUrl}
            alt=""
            className="absolute inset-0 size-full scale-105 object-cover blur-sm brightness-75"
            draggable={false}
          />
        ) : null}
        <div className="relative flex flex-col items-center gap-2">
          <Loader2 className="size-8 animate-spin text-white/90" />
          <StoryBrandMark className="size-10 opacity-80" />
        </div>
      </div>
    ) : null;

  if (story.mediaType === "IMAGE") {
    return (
      <div className="absolute inset-0 overflow-hidden bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mediaUrl}
          alt=""
          className={cn("size-full object-cover", active && "albal-ken-burns")}
          draggable={false}
          onLoad={() => setMediaReady(true)}
        />
        {loadingOverlay}
      </div>
    );
  }

  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      {posterUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={posterUrl}
          alt=""
          className={cn(
            "absolute inset-0 size-full object-cover transition-opacity duration-300",
            mediaReady ? "opacity-0" : "opacity-100",
          )}
          draggable={false}
        />
      ) : null}
      <video
        key={story.id}
        ref={nodeRef}
        src={mediaUrl}
        poster={posterUrl ?? undefined}
        className={cn(
          "absolute inset-0 size-full object-cover transition-opacity duration-300",
          mediaReady ? "opacity-100" : "opacity-0",
        )}
        autoPlay={active}
        muted={!active || muted}
        playsInline
        preload={active || preload ? "auto" : "metadata"}
        controls={false}
        disablePictureInPicture
        onTimeUpdate={(event) => {
          if (!active) {
            return;
          }
          const node = event.currentTarget;
          onProgress(node.duration > 0 ? node.currentTime / node.duration : 0);
        }}
        onEnded={() => {
          if (active) {
            onEnded();
          }
        }}
      />
      {loadingOverlay}
    </div>
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
                <StoryBrandMark className="size-full p-1" />
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
