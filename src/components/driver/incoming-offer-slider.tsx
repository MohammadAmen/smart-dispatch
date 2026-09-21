"use client";

import { animate, m, useMotionValue, useMotionValueEvent } from "framer-motion";
import { Check, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

const KNOB_SIZE = 72;
const TRACK_PAD = 8;
const COMMIT_RATIO = 0.62;
const INTENT_RATIO = 0.16;

type SlideIntent = "idle" | "accept" | "reject";

export function IncomingOfferSlider({
  disabled,
  handleLabel,
  acceptLabel,
  rejectLabel,
  hint,
  onAccept,
  onReject,
}: {
  disabled: boolean;
  handleLabel: string;
  acceptLabel: string;
  rejectLabel: string;
  hint: string;
  onAccept: () => void;
  onReject: () => void;
}): ReactNode {
  const trackRef = useRef<HTMLDivElement>(null);
  const lockedRef = useRef(false);
  const x = useMotionValue(0);
  const [travel, setTravel] = useState(0);
  const [intent, setIntent] = useState<SlideIntent>("idle");

  const measure = useCallback((): void => {
    const track = trackRef.current;
    if (!track) {
      return;
    }
    const next = Math.max(0, (track.clientWidth - KNOB_SIZE) / 2 - TRACK_PAD);
    setTravel(next);
  }, []);

  useEffect(() => {
    measure();
    const track = trackRef.current;
    if (!track || typeof ResizeObserver === "undefined") {
      return;
    }
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    return () => observer.disconnect();
  }, [measure]);

  useMotionValueEvent(x, "change", (value) => {
    if (lockedRef.current || travel <= 0) {
      return;
    }
    const dead = travel * INTENT_RATIO;
    if (value > dead) {
      setIntent("accept");
      return;
    }
    if (value < -dead) {
      setIntent("reject");
      return;
    }
    setIntent("idle");
  });

  function snapOrCommit(): void {
    if (lockedRef.current || disabled || travel <= 0) {
      return;
    }

    const current = x.get();
    const threshold = travel * COMMIT_RATIO;

    if (current >= threshold) {
      lockedRef.current = true;
      setIntent("accept");
      void animate(x, travel, { type: "spring", stiffness: 420, damping: 32 }).then(() => {
        onAccept();
      });
      return;
    }

    if (current <= -threshold) {
      lockedRef.current = true;
      setIntent("reject");
      void animate(x, -travel, { type: "spring", stiffness: 420, damping: 32 }).then(() => {
        onReject();
      });
      return;
    }

    setIntent("idle");
    void animate(x, 0, { type: "spring", stiffness: 540, damping: 36 });
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div
        ref={trackRef}
        className={cn(
          "relative flex h-[5.5rem] items-center overflow-hidden rounded-full border px-3",
          "border-white/18 bg-background/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.28)] backdrop-blur-2xl",
          "transition-colors duration-200",
          intent === "accept" &&
            "border-emerald-400/50 bg-linear-to-r from-emerald-900/10 via-emerald-500/40 to-emerald-300/70",
          intent === "reject" &&
            "border-rose-400/50 bg-linear-to-l from-rose-900/10 via-rose-500/40 to-rose-300/70",
        )}
      >
        <span
          className={cn(
            "pointer-events-none absolute left-6 flex items-center gap-1.5 text-sm font-bold",
            intent === "reject" ? "text-white" : "text-rose-500/80",
          )}
        >
          <X className="size-4" />
          {rejectLabel}
        </span>
        <span
          className={cn(
            "pointer-events-none absolute right-6 flex items-center gap-1.5 text-sm font-bold",
            intent === "accept" ? "text-white" : "text-emerald-500/80",
          )}
        >
          {acceptLabel}
          <Check className="size-4" />
        </span>

        <div className="absolute inset-0 flex items-center justify-center">
          <m.button
            type="button"
            aria-label={handleLabel}
            disabled={disabled}
            drag={disabled ? false : "x"}
            dragConstraints={{ left: -travel, right: travel }}
            dragElastic={0.12}
            dragMomentum={false}
            style={{ x }}
            onDragEnd={snapOrCommit}
            whileTap={{ scale: 1.04 }}
            whileDrag={{ scale: 1.08 }}
            className={cn(
              "z-10 flex size-[4.5rem] touch-none items-center justify-center rounded-full",
              "bg-primary font-heading text-lg font-black tracking-wide text-primary-foreground",
              "shadow-[0_12px_28px_-10px_color-mix(in_oklch,var(--primary)_70%,transparent)]",
              "ring-4 ring-background/40",
              disabled && "pointer-events-none opacity-60",
            )}
          >
            {handleLabel}
          </m.button>
        </div>
      </div>
      <p className="mt-3 text-center text-xs font-semibold text-muted-foreground">{hint}</p>
    </div>
  );
}
