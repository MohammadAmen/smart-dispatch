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
        className="relative overflow-hidden rounded-2xl"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          setDragX(null);
          setPaused(false);
        }}
      >
        <AnimatePresence mode="wait">
          <m.article
            key={offer.id}
            initial={{ opacity: 0, x: rtl ? -18 : 18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: rtl ? 18 : -18 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="relative h-[6.5rem] overflow-hidden rounded-2xl"
          >
            <MenuSafeImage
              src={offer.image}
              alt=""
              className="absolute inset-0 size-full object-cover"
              fallback={
                <span className="absolute inset-0 bg-linear-to-br from-primary/80 via-destructive/50 to-warning/40" />
              }
            />
            <div className="absolute inset-0 bg-linear-to-r from-black/80 via-black/55 to-black/15 rtl:bg-linear-to-l" />
            <div className="relative z-10 flex h-full items-center gap-3 px-3 py-2.5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white">
                <Megaphone className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{offer.title}</p>
                {storeHint ? (
                  <p className="truncate text-[11px] text-white/80">{offer.storeName}</p>
                ) : null}
                <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-black/35 px-2 py-0.5 text-[11px] font-semibold text-warning">
                  <Hourglass className="size-3" />
                  {t("menu.offerRemaining", { time: formatCountdown(remaining) })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onClaim(offer)}
                className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground shadow-sm"
              >
                {t("menu.claimOffer")}
              </button>
            </div>
          </m.article>
        </AnimatePresence>
        {live.length > 1 ? (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              className="absolute start-1 top-1/2 z-20 flex size-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white"
              aria-label={t("menu.offerPrev")}
            >
              <ChevronRight className="size-3.5 rtl:hidden" />
              <ChevronLeft className="size-3.5 hidden rtl:block" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="absolute end-1 top-1/2 z-20 flex size-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white"
              aria-label={t("menu.offerNext")}
            >
              <ChevronLeft className="size-3.5 rtl:hidden" />
              <ChevronRight className="size-3.5 hidden rtl:block" />
            </button>
            <div className="absolute inset-x-0 bottom-1.5 z-20 flex justify-center gap-1">
              {live.map((item, itemIndex) => (
                <span
                  key={item.id}
                  className={cn(
                    "h-1 rounded-full transition-all",
                    itemIndex === index ? "w-4 bg-white" : "w-1.5 bg-white/45",
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
