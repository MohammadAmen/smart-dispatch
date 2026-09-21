"use client";

import { m } from "framer-motion";
import { Banknote, MapPin, Navigation, Store } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { IncomingOfferSlider } from "@/components/driver/incoming-offer-slider";
import { useLocale } from "@/components/providers/locale-provider";
import { startIncomingRingtone, stopIncomingRingtone } from "@/lib/audio";
import { DRIVER_OFFER_SECONDS } from "@/lib/driver/offer-window";
import type { DriverAssignment } from "@/lib/driver/types";
import { calculateDistance, roundDistanceKm } from "@/lib/geo";
import type { LatLngTuple } from "@/lib/live-map";
import { startIncomingVibrate, stopIncomingVibrate } from "@/lib/notify";
import { formatMoney, PRICE_CURRENCY } from "@/lib/stores/pricing";
import { cn } from "@/lib/utils";

const TOTAL_TIME = DRIVER_OFFER_SECONDS;
const URGENT_SECONDS = 10;
const WARN_SECONDS = 20;

function remainingFromOffer(offeredAt: string | null): number {
  if (!offeredAt) {
    return TOTAL_TIME;
  }
  const elapsed = (Date.now() - new Date(offeredAt).getTime()) / 1000;
  if (!Number.isFinite(elapsed)) {
    return TOTAL_TIME;
  }
  return Math.max(0, Math.min(TOTAL_TIME, Math.ceil(TOTAL_TIME - elapsed)));
}

function liveDistanceKm(
  assignment: DriverAssignment,
  driverPoint: LatLngTuple | null,
): number | null {
  const target = assignment.pickup ?? assignment.destination;
  if (!driverPoint) {
    return assignment.distanceKm;
  }
  const distance = roundDistanceKm(
    calculateDistance(driverPoint[0], driverPoint[1], target[0], target[1]),
    1,
  );
  return Number.isFinite(distance) ? distance : assignment.distanceKm;
}

function pulseUrgentVibrate(): void {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") {
    return;
  }
  navigator.vibrate([90, 40, 90, 40, 180]);
}

function stopOfferAlerts(): void {
  stopIncomingRingtone();
  stopIncomingVibrate();
}

export function IncomingOrderOverlay({
  assignment,
  driverPoint,
  busy,
  onAccept,
  onReject,
  onTimeout,
}: {
  assignment: DriverAssignment;
  driverPoint: LatLngTuple | null;
  busy: boolean;
  onAccept: () => void;
  onReject: () => void;
  onTimeout: () => void;
}): ReactNode {
  const { t } = useLocale();
  const timedOutRef = useRef(false);
  const decidedRef = useRef(false);
  const urgentBuzzedRef = useRef(false);
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;
  const [remaining, setRemaining] = useState(() => remainingFromOffer(assignment.offeredAt));
  const distance = liveDistanceKm(assignment, driverPoint);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress = remaining / TOTAL_TIME;
  const urgent = remaining <= URGENT_SECONDS;
  const warn = remaining <= WARN_SECONDS && !urgent;

  useEffect(() => {
    timedOutRef.current = false;
    decidedRef.current = false;
    urgentBuzzedRef.current = false;
    setRemaining(remainingFromOffer(assignment.offeredAt));
    startIncomingRingtone();
    startIncomingVibrate();

    const timer = window.setInterval(() => {
      const next = remainingFromOffer(assignment.offeredAt);
      setRemaining(next);

      if (next <= URGENT_SECONDS && next > 0 && !urgentBuzzedRef.current) {
        urgentBuzzedRef.current = true;
        pulseUrgentVibrate();
      }

      if (next <= 0 && !timedOutRef.current && !decidedRef.current) {
        timedOutRef.current = true;
        stopOfferAlerts();
        onTimeoutRef.current();
      }
    }, 250);

    return () => {
      window.clearInterval(timer);
      stopOfferAlerts();
    };
  }, [assignment.offeredAt, assignment.orderId]);

  function decide(kind: "accept" | "reject"): void {
    if (decidedRef.current || timedOutRef.current) {
      return;
    }
    decidedRef.current = true;
    stopOfferAlerts();
    if (kind === "accept") {
      onAccept();
      return;
    }
    onReject();
  }

  return (
    <m.div
      className="fixed inset-0 z-[80] flex flex-col bg-background/92 px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))] backdrop-blur-xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <p className="text-center text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
        {t("driver.incomingTitle")}
      </p>
      <p className="mt-1 text-center font-mono text-sm font-bold text-primary">
        {assignment.orderNumber}
      </p>

      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        <m.div
          className="relative size-40"
          animate={urgent ? { x: [0, -3, 3, -2, 2, 0] } : { x: 0 }}
          transition={urgent ? { duration: 0.42, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
        >
          <svg viewBox="0 0 120 120" className="-rotate-90 size-full">
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              className="stroke-muted/70"
              strokeWidth="10"
            />
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              className={cn(
                "transition-[stroke] duration-300",
                urgent && "stroke-red-500 drop-shadow-[0_0_12px_rgba(239,68,68,0.85)]",
                warn && "stroke-orange-400 drop-shadow-[0_0_10px_rgba(251,146,60,0.75)]",
                !urgent && !warn && "stroke-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.7)]",
              )}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className={cn(
                "font-heading text-5xl font-bold tabular-nums",
                urgent && "text-red-500",
                warn && "text-orange-500",
              )}
            >
              {remaining}
            </span>
            <span className="text-[11px] font-semibold text-muted-foreground">
              {t("driver.incomingSeconds")}
            </span>
          </div>
        </m.div>

        <div className="w-full max-w-md space-y-3">
          <article className="glass-strong rounded-3xl p-4">
            <div className="flex items-start gap-3">
              <span className="flex size-10 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                <Store className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-muted-foreground uppercase">
                  {t("driver.incomingStore")}
                </p>
                <p className="truncate text-lg font-bold">
                  {assignment.storeName ?? t("driver.storeFallback")}
                </p>
              </div>
            </div>
          </article>

          <div className="grid grid-cols-2 gap-3">
            <article className="glass rounded-3xl p-4">
              <Navigation className="size-5 text-sky-600 dark:text-sky-300" />
              <p className="mt-2 text-xs font-semibold text-muted-foreground uppercase">
                {t("driver.incomingDistance")}
              </p>
              <p className="mt-1 text-xl font-bold">
                {distance != null
                  ? t("driver.distanceKm", { km: distance })
                  : t("driver.distanceUnknown")}
              </p>
            </article>
            <article className="glass rounded-3xl p-4">
              <Banknote className="size-5 text-emerald-600 dark:text-emerald-300" />
              <p className="mt-2 text-xs font-semibold text-muted-foreground uppercase">
                {t("driver.incomingEarn")}
              </p>
              <p className="mt-1 text-xl font-bold">
                {formatMoney(assignment.expectedEarnings)} {PRICE_CURRENCY}
              </p>
            </article>
          </div>

          <article className="glass rounded-3xl p-4">
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 size-5 shrink-0 text-primary" />
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase">
                  {t("driver.address")}
                </p>
                <p className="mt-1 text-base font-semibold leading-snug">{assignment.addressText}</p>
              </div>
            </div>
          </article>
        </div>
      </div>

      <IncomingOfferSlider
        disabled={busy}
        handleLabel={t("driver.slideHandle")}
        acceptLabel={t("driver.slideAccept")}
        rejectLabel={t("driver.slideReject")}
        hint={t("driver.slideHint")}
        onAccept={() => decide("accept")}
        onReject={() => decide("reject")}
      />
    </m.div>
  );
}
