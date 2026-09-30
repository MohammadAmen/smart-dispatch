"use client";

import { AnimatePresence, LazyMotion, MotionConfig, domAnimation, m } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";

import {
  BRAND_NAME,
  BRAND_SPLASH_BEE_SRC,
  BRAND_SPLASH_STORAGE_KEY,
  BRAND_SPLASH_TAGLINES,
  BRAND_SPLASH_WORDMARK_SRC,
} from "@/lib/brand";

const TAGLINE_MS = 2400;
/** Hold long enough for: name → bee flight → settle → taglines. */
const AUTO_EXIT_MS = 9800;
const SKIP_AFTER_MS = 2200;

type SplashPhase = "play" | "exit";

function SplashScreenInner({ onDone }: { onDone: () => void }): ReactNode {
  const [phase, setPhase] = useState<SplashPhase>("play");
  const [taglineIndex, setTaglineIndex] = useState(0);
  const [canSkip, setCanSkip] = useState(false);

  useEffect(() => {
    const skipTimer = window.setTimeout(() => setCanSkip(true), SKIP_AFTER_MS);
    const exitTimer = window.setTimeout(() => setPhase("exit"), AUTO_EXIT_MS);
    return () => {
      window.clearTimeout(skipTimer);
      window.clearTimeout(exitTimer);
    };
  }, []);

  useEffect(() => {
    if (phase !== "play") {
      return;
    }
    const timer = window.setInterval(() => {
      setTaglineIndex((current) => (current + 1) % BRAND_SPLASH_TAGLINES.length);
    }, TAGLINE_MS);
    return () => window.clearInterval(timer);
  }, [phase]);

  const finish = (): void => {
    try {
      window.sessionStorage.setItem(BRAND_SPLASH_STORAGE_KEY, "1");
    } catch {
      // Private mode.
    }
    onDone();
  };

  return (
    <AnimatePresence onExitComplete={finish}>
      {phase === "play" ? (
        <m.div
          key="beev-splash"
          role="dialog"
          aria-label={BRAND_NAME}
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#FFFDF9]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
          onClick={() => {
            if (canSkip) {
              setPhase("exit");
            }
          }}
        >
          <div className="beev-loader-honeycomb pointer-events-none absolute inset-0 opacity-[0.08]" aria-hidden />
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_42%,rgba(245,198,90,0.3),transparent_58%)]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[42%] bg-[radial-gradient(ellipse_at_50%_100%,rgba(196,140,72,0.12),transparent_68%)]"
            aria-hidden
          />

          <div className="relative z-10 flex w-full max-w-lg flex-col items-center px-6 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
            <div className="relative flex h-[12rem] w-full max-w-[22rem] items-center justify-center sm:h-[13rem]">
              <span
                className="pointer-events-none absolute left-1/2 top-[58%] size-44 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(245,186,66,0.38)_0%,transparent_70%)] sm:size-52"
                aria-hidden
              />

              {/* Hero name — large, centered */}
              <m.img
                src={BRAND_SPLASH_WORDMARK_SRC}
                alt={BRAND_NAME}
                width={360}
                height={150}
                decoding="async"
                draggable={false}
                className="relative z-10 h-[4.85rem] w-auto max-w-[90%] bg-transparent object-contain drop-shadow-[0_10px_24px_rgba(92,61,30,0.18)] sm:h-[5.75rem]"
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              />

              {/* Bee flies from top corner and lands near the name */}
              <m.div
                className="absolute left-1/2 top-1/2 z-20"
                initial={{
                  x: "-58vw",
                  y: "-48vh",
                  opacity: 0,
                  scale: 0.5,
                  rotate: -26,
                }}
                animate={{
                  x: "2.6rem",
                  y: "-5.4rem",
                  opacity: 1,
                  scale: 1,
                  rotate: 0,
                }}
                transition={{
                  delay: 0.65,
                  type: "spring",
                  stiffness: 118,
                  damping: 16,
                  mass: 0.95,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={BRAND_SPLASH_BEE_SRC}
                  alt=""
                  width={168}
                  height={168}
                  decoding="async"
                  draggable={false}
                  className="beev-splash-bee h-[6.5rem] w-[6.5rem] -translate-x-1/2 -translate-y-1/2 bg-transparent object-contain drop-shadow-[0_16px_28px_rgba(180,120,40,0.35)] sm:h-[7.25rem] sm:w-[7.25rem]"
                />
              </m.div>
            </div>

            <div className="relative mt-7 h-12 w-full max-w-sm overflow-hidden">
              <AnimatePresence mode="wait">
                <m.p
                  key={taglineIndex}
                  className="absolute inset-x-0 text-center font-heading text-[0.98rem] font-semibold leading-relaxed text-[#5C3D1E] sm:text-[1.05rem]"
                  initial={{ y: 18, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -16, opacity: 0 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                >
                  {BRAND_SPLASH_TAGLINES[taglineIndex]}
                </m.p>
              </AnimatePresence>
            </div>

            <m.div
              className="mt-10 h-1.5 w-32 overflow-hidden rounded-full bg-[#E8DFD0]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              <m.span
                className="block h-full origin-right rounded-full bg-linear-to-l from-[#C48C48] to-amber-400 rtl:origin-left"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: AUTO_EXIT_MS / 1000, ease: "linear" }}
              />
            </m.div>
          </div>
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}

export function SplashScreen({ onDone }: { onDone: () => void }): ReactNode {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <SplashScreenInner onDone={onDone} />
      </MotionConfig>
    </LazyMotion>
  );
}
