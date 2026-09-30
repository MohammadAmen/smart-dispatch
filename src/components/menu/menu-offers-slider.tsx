"use client";

import { AnimatePresence, m } from "framer-motion";
import { ChevronLeft, ChevronRight, Hourglass } from "lucide-react";
import { useEffect, useMemo, useState, type PointerEvent, type ReactNode } from "react";

import { MenuSafeImage } from "@/components/menu/menu-safe-image";
import { useLocale } from "@/components/providers/locale-provider";
import {
  formatCountdown,
  isOfferLive,
  remainingMs,
  type PublicOffer,
} from "@/lib/stores/offer-types";
import { cn } from "@/lib/utils";

/** Offer slide — image-first, light scrim only under copy so food stays vivid. */
export function PromoBanner({
  offer,
  storeHint,
  onClaim,
  claimLabel,
  remainingLabel,
}: {
  offer: PublicOffer;
  storeHint: boolean;
  onClaim: () => void;
  claimLabel: string;
  remainingLabel: string;
}): ReactNode {
  return (
    <article className="relative h-[11.25rem] overflow-hidden rounded-3xl border border-slate-200/70 bg-slate-100 shadow-[0_16px_36px_-22px_rgba(15,23,42,0.45)] sm:h-[12rem] dark:border-slate-700 dark:bg-slate-900">
      <MenuSafeImage
        src={offer.image}
        alt=""
        className="absolute inset-0 size-full object-cover"
        fallback={
          <span className="absolute inset-0 bg-linear-to-br from-amber-100 via-orange-50 to-rose-100 dark:from-slate-800 dark:via-slate-900 dark:to-amber-950/40" />
        }
      />
      {/* Soft readable band — keeps most of the photo bright */}
      <div className="absolute inset-0 bg-linear-to-t from-black/55 via-black/15 to-black/5" />
      <div className="absolute inset-y-0 start-0 w-[58%] bg-linear-to-r from-black/45 via-black/18 to-transparent rtl:bg-linear-to-l" />

      <div className="relative z-10 flex h-full flex-col justify-between gap-2 p-3.5 sm:p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {storeHint ? (
              <p className="mb-0.5 truncate text-[11px] font-semibold text-white/85 drop-shadow-sm">
                {offer.storeName}
              </p>
            ) : null}
            <p className="line-clamp-2 text-[1.05rem] font-extrabold leading-snug tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.55)] sm:text-lg">
              {offer.title}
            </p>
          </div>
          <p className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold text-slate-800 shadow-sm backdrop-blur-sm sm:text-[11px]">
            <Hourglass className="size-3 shrink-0 text-amber-600" />
            <span className="tabular-nums">{remainingLabel}</span>
          </p>
        </div>

        <div className="flex items-end justify-between gap-3">
          <button
            type="button"
            onClick={onClaim}
            className="inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-[0_10px_24px_-10px_rgba(245,158,11,0.85)] transition hover:bg-amber-300 active:scale-[0.98] sm:px-5 sm:text-sm"
          >
            {claimLabel}
            <ChevronLeft className="size-3.5 rtl:hidden" />
            <ChevronRight className="size-3.5 hidden rtl:block" />
          </button>
        </div>
      </div>
    </article>
  );
}

export function MenuOffersSlider({
  offers,
  onClaim,
  storeHint = false,
}: {
  offers: PublicOffer[];
  onClaim: (offer: PublicOffer) => void;
  storeHint?: boolean;
}): ReactNode {
  const { t, locale } = useLocale();
  const [now, setNow] = useState(() => Date.now());
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [dragX, setDragX] = useState<number | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const live = useMemo(
    () => offers.filter((offer) => isOfferLive(offer, now)),
    [now, offers],
  );

  useEffect(() => {
    if (index >= live.length) {
      setIndex(0);
    }
  }, [index, live.length]);

  useEffect(() => {
    if (paused || live.length <= 1) {
      return;
    }
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % live.length);
    }, 5200);
    return () => window.clearInterval(timer);
  }, [live.length, paused]);

  if (live.length === 0) {
    return null;
  }

  const offer = live[Math.min(index, live.length - 1)];
  if (!offer) {
    return null;
  }

  const remaining = remainingMs(offer.endDate, now);
  const rtl = locale === "ar";

  const go = (delta: number): void => {
    setIndex((current) => (current + delta + live.length) % live.length);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    setPaused(true);
    setDragX(event.clientX);
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>): void => {
    if (dragX != null) {
      const delta = event.clientX - dragX;
      if (Math.abs(delta) > 36) {
        go(rtl ? (delta > 0 ? 1 : -1) : delta > 0 ? -1 : 1);
      }
    }
    setDragX(null);
    setPaused(false);
  };

  return (
    <section
      className="px-4 pt-3"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
    >
      <div
        className="relative overflow-hidden rounded-3xl"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          setDragX(null);
          setPaused(false);
        }}
      >
        <AnimatePresence mode="wait">
          <m.div
            key={offer.id}
            initial={{ opacity: 0, x: rtl ? -18 : 18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: rtl ? 18 : -18 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <PromoBanner
              offer={offer}
              storeHint={storeHint}
              onClaim={() => onClaim(offer)}
              claimLabel={t("menu.claimOffer")}
              remainingLabel={t("menu.offerRemaining", {
                time: formatCountdown(remaining),
              })}
            />
          </m.div>
        </AnimatePresence>

        {live.length > 1 ? (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              className="absolute start-2 top-1/2 z-20 flex size-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-white/85 text-slate-800 shadow-md backdrop-blur-md"
              aria-label={t("menu.offerPrev")}
            >
              <ChevronRight className="size-3.5 rtl:hidden" />
              <ChevronLeft className="size-3.5 hidden rtl:block" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="absolute end-2 top-1/2 z-20 flex size-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-white/85 text-slate-800 shadow-md backdrop-blur-md"
              aria-label={t("menu.offerNext")}
            >
              <ChevronLeft className="size-3.5 rtl:hidden" />
              <ChevronRight className="size-3.5 hidden rtl:block" />
            </button>
            <div className="absolute inset-x-0 bottom-2.5 z-20 flex justify-center gap-1.5">
              {live.map((item, itemIndex) => (
                <span
                  key={item.id}
                  className={cn(
                    "h-1.5 rounded-full shadow-sm transition-all",
                    itemIndex === index ? "w-5 bg-amber-400" : "w-1.5 bg-white/90",
                  )}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
