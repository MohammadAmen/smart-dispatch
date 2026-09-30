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

const TAGLINE_MS = 2500;
const AUTO_EXIT_MS = 10_200;
const SKIP_AFTER_MS = 2400;

type SplashPhase = "play" | "exit";

/**
 * Splash: large centered BEEV wordmark, bee flies from the top corner
 * and settles above the name — using the dedicated brand splash assets.
 */
function SplashScreenInner({ onDone }: { onDone: () => void }): ReactNode {
  const [phase, setPhase] = useState<SplashPhase>("play");
  const [taglineIndex, setTaglineIndex] = useState(0);
  const [canSkip, setCanSkip] = useState(false);
  const [beeLanded, setBeeLanded] = useState(false);

  useEffect(() => {
    const skipTimer = window.setTimeout(() => setCanSkip(true), SKIP_AFTER_MS);
    const landTimer = window.setTimeout(() => setBeeLanded(true), 2100);
    const exitTimer = window.setTimeout(() => setPhase("exit"), AUTO_EXIT_MS);
    return () => {
      window.clearTimeout(skipTimer);
      window.clearTimeout(landTimer);
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
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          onClick={() => {
            if (canSkip) {
              setPhase("exit");
            }
          }}
        >
          <div className="beev-loader-honeycomb pointer-events-none absolute inset-0 opacity-[0.07]" aria-hidden />
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(245,198,90,0.32),transparent_56%)]"
            aria-hidden
          />

          <div className="relative z-10 flex w-full max-w-lg flex-col items-center px-5 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
            {/* Brand stage */}
            <div className="relative mx-auto flex h-[14.5rem] w-full max-w-[21rem] items-end justify-center pb-2 sm:h-[15.5rem] sm:max-w-[23rem]">
              <span
                className="pointer-events-none absolute bottom-6 left-1/2 size-52 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(245,186,66,0.4)_0%,transparent_68%)] sm:size-60"
                aria-hidden
              />

              {/* Name — hero, dead center */}
              <m.img
                src={BRAND_SPLASH_WORDMARK_SRC}
                alt={BRAND_NAME}
                width={420}
                height={160}
                decoding="async"
                draggable={false}
                className="relative z-10 h-[5.25rem] w-auto max-w-[92%] object-contain mix-blend-multiply drop-shadow-[0_8px_18px_rgba(62,39,22,0.12)] sm:h-[6rem]"
                initial={{ opacity: 0, y: 22, scale: 0.88 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
              />

              {/* Bee — corner flight → perch above the name */}
              <m.div
                className="absolute bottom-[4.6rem] left-1/2 z-20 sm:bottom-[5.2rem]"
                initial={{
                  x: "-52vw",
                  y: "-46vh",
                  opacity: 0,
                  scale: 0.42,
                  rotate: -28,
                }}
                animate={{
                  x: "1.1rem",
                  y: 0,
                  opacity: 1,
                  scale: 1,
                  rotate: 0,
                }}
                transition={{
                  delay: 0.7,
                  type: "spring",
                  stiffness: 105,
                  damping: 15,
                  mass: 1,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={BRAND_SPLASH_BEE_SRC}
                  alt=""
                  width={200}
                  height={200}
                  decoding="async"
                  draggable={false}
                  className={`h-[7.25rem] w-[7.25rem] -translate-x-1/2 object-contain drop-shadow-[0_18px_32px_rgba(180,120,40,0.38)] sm:h-[8rem] sm:w-[8rem] ${
                    beeLanded ? "beev-splash-bee" : ""
                  }`}
                />
              </m.div>
            </div>

            <div className="relative mt-6 h-12 w-full max-w-sm overflow-hidden">
              <AnimatePresence mode="wait">
                <m.p
                  key={taglineIndex}
                  className="absolute inset-x-0 text-center font-heading text-[0.98rem] font-semibold leading-relaxed text-[#5C3D1E] sm:text-[1.05rem]"
                  initial={{ y: 16, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -14, opacity: 0 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                >
                  {BRAND_SPLASH_TAGLINES[taglineIndex]}
                </m.p>
              </AnimatePresence>
            </div>

            <m.div
              className="mt-9 h-1.5 w-36 overflow-hidden rounded-full bg-[#E8DFD0]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1 }}
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
