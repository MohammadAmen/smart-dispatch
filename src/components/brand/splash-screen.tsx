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
const AUTO_EXIT_MS = 11_000;
const SKIP_AFTER_MS = 2600;
const BEE_FLIGHT_DELAY_MS = 550;
const BEE_FLIGHT_MS = 2800;

/** Spiral flight path into the perch above the wordmark (px from landing origin). */
function buildBeeSpiralFlight(): {
  x: number[];
  y: number[];
  rotate: number[];
  scale: number[];
  opacity: number[];
} {
  const landX = 18;
  const landY = 0;
  const steps = 16;
  const x: number[] = [];
  const y: number[] = [];
  const rotate: number[] = [];
  const scale: number[] = [];
  const opacity: number[] = [];

  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    // Ease in so the last loop tightens and the landing softens.
    const eased = 1 - (1 - t) ** 1.45;
    const radius = 310 * (1 - eased);
    // ~1.85 turns from the top-left into the perch.
    const angle = -2.55 + eased * Math.PI * 3.7;
    x.push(landX + Math.cos(angle) * radius);
    y.push(landY + Math.sin(angle) * radius);
    // Bank into the curve so it reads as flying, not sliding.
    const bank = Math.cos(angle) * 34 * (1 - eased * 0.9);
    rotate.push(bank);
    scale.push(0.38 + eased * 0.62);
    opacity.push(t === 0 ? 0 : Math.min(1, 0.15 + t * 3.2));
  }

  // Final settle — level and exact perch.
  x[x.length - 1] = landX;
  y[y.length - 1] = landY;
  rotate[rotate.length - 1] = 0;
  scale[scale.length - 1] = 1;
  opacity[opacity.length - 1] = 1;

  return { x, y, rotate, scale, opacity };
}

const BEE_SPIRAL = buildBeeSpiralFlight();


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
    const landTimer = window.setTimeout(
      () => setBeeLanded(true),
      BEE_FLIGHT_DELAY_MS + BEE_FLIGHT_MS + 80,
    );
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

              {/* Bee — spiral flight into perch above the name */}
              <m.div
                className="absolute bottom-[4.6rem] left-1/2 z-20 sm:bottom-[5.2rem]"
                initial={{
                  x: BEE_SPIRAL.x[0],
                  y: BEE_SPIRAL.y[0],
                  opacity: 0,
                  scale: BEE_SPIRAL.scale[0],
                  rotate: BEE_SPIRAL.rotate[0],
                }}
                animate={{
                  x: BEE_SPIRAL.x,
                  y: BEE_SPIRAL.y,
                  opacity: BEE_SPIRAL.opacity,
                  scale: BEE_SPIRAL.scale,
                  rotate: BEE_SPIRAL.rotate,
                }}
                transition={{
                  delay: BEE_FLIGHT_DELAY_MS / 1000,
                  duration: BEE_FLIGHT_MS / 1000,
                  ease: "linear",
                  times: BEE_SPIRAL.x.map((_, index) => index / (BEE_SPIRAL.x.length - 1)),
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
                  className={
                    beeLanded
                      ? "beev-splash-bee h-[7.25rem] w-[7.25rem] -translate-x-1/2 object-contain drop-shadow-[0_18px_32px_rgba(180,120,40,0.38)] sm:h-[8rem] sm:w-[8rem]"
                      : "beev-splash-bee-fly h-[7.25rem] w-[7.25rem] -translate-x-1/2 object-contain drop-shadow-[0_18px_32px_rgba(180,120,40,0.38)] sm:h-[8rem] sm:w-[8rem]"
                  }
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
