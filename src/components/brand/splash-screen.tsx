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

const TAGLINE_MS = 2000;
const AUTO_EXIT_MS = 5800;

type SplashPhase = "play" | "exit";

function SplashScreenInner({ onDone }: { onDone: () => void }): ReactNode {
  const [phase, setPhase] = useState<SplashPhase>("play");
  const [taglineIndex, setTaglineIndex] = useState(0);

  useEffect(() => {
    const exitTimer = window.setTimeout(() => setPhase("exit"), AUTO_EXIT_MS);
    return () => window.clearTimeout(exitTimer);
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
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          onClick={() => setPhase("exit")}
        >
          {/* Full-bleed brand surface — CSS only */}
          <div className="beev-loader-honeycomb pointer-events-none absolute inset-0 opacity-[0.08]" aria-hidden />
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(245,198,90,0.28),transparent_60%)]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[40%] bg-[radial-gradient(ellipse_at_50%_100%,rgba(196,140,72,0.12),transparent_70%)]"
            aria-hidden
          />

          <div className="relative z-10 flex w-full max-w-md flex-col items-center px-6 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
            {/* Centered lockup as one unit */}
            <div className="relative flex items-center justify-center gap-1.5 sm:gap-2">
              <span
                className="pointer-events-none absolute inset-[-30%] rounded-full bg-[radial-gradient(circle,rgba(245,186,66,0.35)_0%,transparent_68%)]"
                aria-hidden
              />
              <m.div
                className="relative z-20"
                initial={{ y: -72, opacity: 0, scale: 0.82, rotate: -8 }}
                animate={{ y: 0, opacity: 1, scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 280, damping: 18, mass: 0.8 }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={BRAND_SPLASH_BEE_SRC}
                  alt=""
                  width={128}
                  height={128}
                  decoding="async"
                  draggable={false}
                  className="beev-splash-bee h-[4.85rem] w-[4.85rem] bg-transparent object-contain sm:h-[5.5rem] sm:w-[5.5rem]"
                />
              </m.div>
              <m.img
                src={BRAND_SPLASH_WORDMARK_SRC}
                alt={BRAND_NAME}
                width={280}
                height={120}
                decoding="async"
                draggable={false}
                className="relative z-10 h-[3.35rem] w-auto max-w-[58%] bg-transparent object-contain sm:h-[3.85rem]"
                initial={{ x: 28, opacity: 0, filter: "blur(4px)" }}
                animate={{ x: 0, opacity: 1, filter: "blur(0px)" }}
                transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: 0.12 }}
              />
            </div>

            <div className="relative mt-9 h-12 w-full max-w-sm overflow-hidden">
              <AnimatePresence mode="wait">
                <m.p
                  key={taglineIndex}
                  className="absolute inset-x-0 text-center font-heading text-[0.95rem] font-semibold leading-relaxed text-[#5C3D1E] sm:text-base"
                  initial={{ y: 16, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -14, opacity: 0 }}
                  transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                >
                  {BRAND_SPLASH_TAGLINES[taglineIndex]}
                </m.p>
              </AnimatePresence>
            </div>

            <m.div
              className="mt-9 h-1 w-28 overflow-hidden rounded-full bg-[#E8DFD0]"
              initial={{ opacity: 0, scaleX: 0.6 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ delay: 0.35, duration: 0.4 }}
            >
              <m.span
                className="block h-full origin-right rounded-full bg-linear-to-l from-[#C48C48] to-amber-400 rtl:origin-left"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: AUTO_EXIT_MS / 1000, ease: "linear" }}
              />
            </m.div>

            <m.p
              className="mt-5 text-[11px] font-medium tracking-wide text-[#8B6A45]/80"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1 }}
            >
              {BRAND_NAME}
            </m.p>
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
