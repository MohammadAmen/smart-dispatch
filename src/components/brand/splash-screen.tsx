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

const TAGLINE_MS = 2200;
const AUTO_EXIT_MS = 7200;

type SplashPhase = "intro" | "settle" | "exit";

function SplashScreenInner({ onDone }: { onDone: () => void }): ReactNode {
  const [phase, setPhase] = useState<SplashPhase>("intro");
  const [taglineIndex, setTaglineIndex] = useState(0);
  const [beeReady, setBeeReady] = useState(false);

  useEffect(() => {
    const settleTimer = window.setTimeout(() => {
      setBeeReady(true);
      setPhase("settle");
    }, 1100);
    const exitTimer = window.setTimeout(() => {
      setPhase("exit");
    }, AUTO_EXIT_MS);
    return () => {
      window.clearTimeout(settleTimer);
      window.clearTimeout(exitTimer);
    };
  }, []);

  useEffect(() => {
    if (phase !== "settle") {
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
      {phase !== "exit" ? (
        <m.div
          key="beev-splash"
          role="dialog"
          aria-label={BRAND_NAME}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-[#FFFDF9]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          onClick={() => setPhase("exit")}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,rgba(245,198,90,0.18),transparent_58%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_85%,rgba(196,140,72,0.08),transparent_50%)]" />

          <div className="relative z-10 flex w-full max-w-md flex-col items-center px-6">
            <div className="relative flex h-[9.5rem] w-full items-center justify-center">
              <m.img
                src={BRAND_SPLASH_WORDMARK_SRC}
                alt={BRAND_NAME}
                width={280}
                height={120}
                decoding="async"
                draggable={false}
                className="relative z-10 h-[5.75rem] w-auto max-w-[70%] bg-transparent object-contain"
                initial={{ x: 140, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              />

              <m.img
                src={BRAND_SPLASH_BEE_SRC}
                alt=""
                width={140}
                height={140}
                decoding="async"
                draggable={false}
                className="absolute end-[8%] top-0 z-20 h-[6.5rem] w-[6.5rem] bg-transparent object-contain sm:end-[12%]"
                initial={{ y: -160, opacity: 0, scale: 0.86 }}
                animate={
                  beeReady
                    ? { y: [0, -10, 0], opacity: 1, scale: 1 }
                    : { y: 0, opacity: 1, scale: 1 }
                }
                transition={
                  beeReady
                    ? {
                        y: { duration: 2.4, repeat: Infinity, ease: "easeInOut" },
                        opacity: { duration: 0.2 },
                        scale: { type: "spring", stiffness: 260, damping: 14 },
                      }
                    : {
                        y: { type: "spring", stiffness: 320, damping: 16, mass: 0.85, delay: 0.28 },
                        opacity: { duration: 0.28, delay: 0.28 },
                        scale: { type: "spring", stiffness: 280, damping: 14, delay: 0.28 },
                      }
                }
              />
            </div>

            <div className="relative mt-8 h-14 w-full max-w-sm overflow-hidden">
              <AnimatePresence mode="wait">
                <m.p
                  key={taglineIndex}
                  className="absolute inset-x-0 text-center font-heading text-[0.95rem] font-semibold leading-relaxed text-[#5C3D1E] sm:text-base"
                  initial={{ y: 22, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -18, opacity: 0 }}
                  transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                >
                  {BRAND_SPLASH_TAGLINES[taglineIndex]}
                </m.p>
              </AnimatePresence>
            </div>

            <m.div
              className="mt-10 h-1 w-24 overflow-hidden rounded-full bg-[#E8DFD0]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              <m.span
                className="block h-full origin-right rounded-full bg-[#C48C48]"
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
