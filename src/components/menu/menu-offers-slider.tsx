"use client";

import { AnimatePresence, m } from "framer-motion";
import { ChevronLeft, ChevronRight, Hourglass, Megaphone } from "lucide-react";
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

/** Luxury promotional banner slide — alias for design-system naming. */
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
    <article className="relative h-[10.5rem] overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 shadow-lg sm:h-[11.25rem]">
      <MenuSafeImage
        src={offer.image}
        alt=""
        className="absolute inset-0 size-full scale-105 object-cover"
        fallback={
          <span className="absolute inset-0 bg-linear-to-br from-slate-900 via-slate-800 to-amber-950/40" />
        }
      />
      {/* Dark luxury gradient — keeps type readable over food art */}
      <div className="absolute inset-0 bg-linear-to-r from-slate-950 via-slate-950/88 to-slate-950/35 rtl:bg-linear-to-l" />
      <div className="absolute inset-0 bg-linear-to-t from-slate-950/70 via-transparent to-slate-950/25" />

      <div className="relative z-10 flex h-full items-center gap-3 px-3.5 py-3.5 sm:gap-4 sm:px-5">
        {/* Alert / megaphone badge */}
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-amber-300 shadow-inner ring-1 ring-white/20 backdrop-blur-md sm:size-12">
          <Megaphone className="size-[1.1rem]" />
        </span>

        {/* Typography + countdown */}
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
          <p className="line-clamp-2 text-base font-bold leading-snug tracking-tight text-white drop-shadow-sm sm:text-[1.0625rem]">
            {offer.title}
          </p>
          {storeHint ? (
            <p className="truncate text-sm text-slate-400">{offer.storeName}</p>
          ) : null}
          <p className="inline-flex w-fit max-w-full items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-amber-300 shadow-sm backdrop-blur-md sm:text-xs">
            <Hourglass className="size-3 shrink-0 text-amber-200" />
            <span className="truncate tabular-nums">{remainingLabel}</span>
          </p>
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={onClaim}
          className="flex shrink-0 items-center gap-2 rounded-full bg-amber-400 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-md transition-all hover:bg-amber-500 active:scale-[0.98] sm:px-6 sm:text-sm"
        >
          {claimLabel}
        </button>
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
              className="absolute start-1.5 top-1/2 z-20 flex size-7 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-slate-950/55 text-white backdrop-blur-md"
              aria-label={t("menu.offerPrev")}
            >
              <ChevronRight className="size-3.5 rtl:hidden" />
              <ChevronLeft className="size-3.5 hidden rtl:block" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="absolute end-1.5 top-1/2 z-20 flex size-7 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-slate-950/55 text-white backdrop-blur-md"
              aria-label={t("menu.offerNext")}
            >
              <ChevronLeft className="size-3.5 rtl:hidden" />
              <ChevronRight className="size-3.5 hidden rtl:block" />
            </button>
            <div className="absolute inset-x-0 bottom-2 z-20 flex justify-center gap-1.5">
              {live.map((item, itemIndex) => (
                <span
                  key={item.id}
                  className={cn(
                    "h-1 rounded-full transition-all",
                    itemIndex === index ? "w-4 bg-amber-400" : "w-1.5 bg-white/40",
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
