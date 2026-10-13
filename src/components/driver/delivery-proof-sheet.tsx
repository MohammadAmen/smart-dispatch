"use client";

import { AnimatePresence, m } from "framer-motion";
import { Camera, CheckCircle2, Keyboard, QrCode, ScanLine, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import type { DriverDeliveryProofMode } from "@/lib/driver/types";
import {
  DELIVERY_PROOF_CODE_LENGTH,
  isValidDeliveryProofCode,
  parseDeliveryProofQrPayload,
} from "@/lib/finance/delivery-proof";
import { cn } from "@/lib/utils";

type ProofTab = "scan" | "code";

interface DeliveryProofSheetProps {
  mode: DriverDeliveryProofMode
  orderNumber: string
  busy: boolean
  error?: string | null
  onCancel: () => void
  onConfirm: (input: { otp: string; photo: File | null }) => void
}

interface BarcodeDetectorLike {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>
}

declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats?: string[] }) => BarcodeDetectorLike
  }
}

export function DeliveryProofSheet({
  mode,
  orderNumber,
  busy,
  error,
  onCancel,
  onConfirm,
}: DeliveryProofSheetProps): ReactNode {
  const { t } = useLocale();
  const titleId = useId();
  const needsOtp = mode === "OTP" || mode === "BOTH";
  const needsPhoto = mode === "PHOTO" || mode === "BOTH";
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<ProofTab>(needsOtp ? "scan" : "code");
  const [digits, setDigits] = useState<string[]>(
    () => Array.from({ length: DELIVERY_PROOF_CODE_LENGTH }, () => ""),
  );
  const [photo, setPhoto] = useState<File | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanReady, setScanReady] = useState(false);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const submittedRef = useRef(false);

  const code = digits.join("");
  const canSubmit =
    (!needsOtp || isValidDeliveryProofCode(code)) && (!needsPhoto || photo != null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const stopCamera = useCallback((): void => {
    if (rafRef.current != null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setScanReady(false);
  }, []);

  const submitCode = useCallback(
    (raw: string): void => {
      if (submittedRef.current || busy) {
        return;
      }
      const parsed = parseDeliveryProofQrPayload(raw);
      const nextCode = parsed?.code ?? raw.replace(/\D/g, "");
      if (!isValidDeliveryProofCode(nextCode)) {
        setScanError(t("driver.proofInvalidOtp"));
        return;
      }
      if (
        parsed?.orderNumber &&
        parsed.orderNumber !== orderNumber &&
        !orderNumber.includes(parsed.orderNumber)
      ) {
        setScanError(t("driver.proofWrongOrder"));
        return;
      }
      submittedRef.current = true;
      stopCamera();
      const visual = nextCode.slice(0, DELIVERY_PROOF_CODE_LENGTH).split("");
      while (visual.length < DELIVERY_PROOF_CODE_LENGTH) {
        visual.push("");
      }
      setDigits(visual);
      onConfirm({ otp: nextCode, photo });
    },
    [busy, onConfirm, orderNumber, photo, stopCamera, t],
  );

  useEffect(() => {
    if (!mounted || tab !== "scan" || !needsOtp || busy) {
      stopCamera();
      return;
    }

    let cancelled = false;
    submittedRef.current = false;

    const start = async (): Promise<void> => {
      setScanError(null);
      if (!navigator.mediaDevices?.getUserMedia) {
        setScanError(t("driver.proofScanUnsupported"));
        setTab("code");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) {
          return;
        }
        video.srcObject = stream;
        await video.play();
        setScanReady(true);

        const Detector = window.BarcodeDetector;
        if (!Detector) {
          setScanError(t("driver.proofScanFallback"));
          return;
        }

        const detector = new Detector({ formats: ["qr_code"] });
        const tick = async (): Promise<void> => {
          if (cancelled || submittedRef.current || !videoRef.current) {
            return;
          }
          try {
            if (videoRef.current.readyState >= 2) {
              const codes = await detector.detect(videoRef.current);
              const raw = codes[0]?.rawValue?.trim();
              if (raw) {
                submitCode(raw);
                return;
              }
            }
          } catch {
            // keep scanning
          }
          rafRef.current = window.requestAnimationFrame(() => {
            void tick();
          });
        };
        rafRef.current = window.requestAnimationFrame(() => {
          void tick();
        });
      } catch {
        if (!cancelled) {
          setScanError(t("driver.proofScanDenied"));
          setTab("code");
        }
      }
    };

    void start();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [busy, mounted, needsOtp, stopCamera, submitCode, t, tab]);

  const setDigitAt = (index: number, value: string): void => {
    const clean = value.replace(/\D/g, "");
    if (!clean) {
      setDigits((current) => {
        const next = [...current];
        next[index] = "";
        return next;
      });
      return;
    }

    const chars = clean.slice(0, DELIVERY_PROOF_CODE_LENGTH - index).split("");
    setDigits((current) => {
      const next = [...current];
      chars.forEach((char, offset) => {
        next[index + offset] = char;
      });
      const joined = next.join("");
      if (joined.length === DELIVERY_PROOF_CODE_LENGTH && !needsPhoto) {
        window.setTimeout(() => submitCode(joined), 80);
      }
      return next;
    });
    const focusAt = Math.min(index + chars.length, DELIVERY_PROOF_CODE_LENGTH - 1);
    inputRefs.current[focusAt]?.focus();
  };

  if (!mounted) {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      <m.div
        key="proof-root"
        className="fixed inset-0 z-[240] flex items-end justify-center sm:items-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <button
          type="button"
          aria-label={t("common.cancel")}
          className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
          onClick={busy ? undefined : onCancel}
        />

        <m.div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          initial={{ y: 48, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 28, opacity: 0, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          className="relative z-10 flex max-h-[min(92dvh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(2,6,23,0.98))] text-white shadow-[0_-24px_80px_-20px_rgba(0,0,0,0.65)] sm:rounded-[28px]"
        >
          <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.22em] text-amber-300/90 uppercase">
                BEEV · {orderNumber}
              </p>
              <h2 id={titleId} className="mt-1 font-heading text-xl font-semibold">
                {t("driver.proofTitle")}
              </h2>
              <p className="mt-1 text-sm text-slate-300">{t("driver.proofHintQr")}</p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="rounded-full bg-white/10 p-2 text-slate-200 transition hover:bg-white/15"
              aria-label={t("common.cancel")}
            >
              <X className="size-4" />
            </button>
          </div>

          {needsOtp ? (
            <div className="mx-5 mb-3 grid grid-cols-2 gap-1 rounded-2xl bg-white/5 p-1 ring-1 ring-white/10">
              {(
                [
                  { id: "scan" as const, icon: ScanLine, label: t("driver.proofTabScan") },
                  { id: "code" as const, icon: Keyboard, label: t("driver.proofTabCode") },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={cn(
                    "inline-flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition",
                    tab === item.id
                      ? "bg-amber-400 text-slate-950 shadow"
                      : "text-slate-300 hover:bg-white/5",
                  )}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
            {needsOtp && tab === "scan" ? (
              <div className="space-y-3">
                <div className="relative overflow-hidden rounded-3xl bg-black ring-1 ring-white/10">
                  <video
                    ref={videoRef}
                    muted
                    playsInline
                    className="aspect-[3/4] w-full object-cover"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_38%,rgba(2,6,23,0.55)_100%)]" />
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="relative size-48 rounded-3xl border-2 border-amber-300/80 shadow-[0_0_0_999px_rgba(2,6,23,0.28)]">
                      <span className="absolute top-0 left-0 size-6 rounded-tl-2xl border-t-4 border-l-4 border-amber-300" />
                      <span className="absolute top-0 right-0 size-6 rounded-tr-2xl border-t-4 border-r-4 border-amber-300" />
                      <span className="absolute bottom-0 left-0 size-6 rounded-bl-2xl border-b-4 border-l-4 border-amber-300" />
                      <span className="absolute right-0 bottom-0 size-6 rounded-br-2xl border-r-4 border-b-4 border-amber-300" />
                      <m.div
                        className="absolute inset-x-3 h-0.5 bg-amber-300/90"
                        animate={{ top: ["12%", "88%", "12%"] }}
                        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                      />
                    </div>
                  </div>
                  {!scanReady ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-950/50 text-sm text-slate-200">
                      {t("driver.proofScanStarting")}
                    </div>
                  ) : null}
                </div>
                <p className="text-center text-xs text-slate-400">{t("driver.proofScanHint")}</p>
              </div>
            ) : null}

            {needsOtp && tab === "code" ? (
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-slate-400">
                  <QrCode className="size-3.5" />
                  {t("driver.proofCodeHint")}
                </div>
                <div className="flex justify-center gap-2" dir="ltr">
                  {digits.map((digit, index) => (
                    <input
                      // eslint-disable-next-line react/no-array-index-key
                      key={`digit-${index}`}
                      ref={(node) => {
                        inputRefs.current[index] = node;
                      }}
                      inputMode="numeric"
                      autoComplete={index === 0 ? "one-time-code" : "off"}
                      maxLength={index === 0 ? DELIVERY_PROOF_CODE_LENGTH : 1}
                      value={digit}
                      onChange={(event) => setDigitAt(index, event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Backspace" && !digits[index] && index > 0) {
                          inputRefs.current[index - 1]?.focus();
                        }
                      }}
                      className="h-14 w-11 rounded-2xl border border-white/15 bg-white/5 text-center font-heading text-2xl font-bold text-white outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-300/30 sm:h-16 sm:w-12"
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {needsPhoto ? (
              <label className="mt-4 block space-y-2 rounded-2xl border border-dashed border-white/20 bg-white/5 p-4 text-xs text-slate-300">
                <span className="inline-flex items-center gap-1.5 font-semibold text-white">
                  <Camera className="size-3.5" />
                  {t("driver.proofPhoto")}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
                  className="block w-full text-sm file:mr-3 file:rounded-xl file:border-0 file:bg-amber-400/20 file:px-3 file:py-2 file:text-sm file:font-medium file:text-amber-200"
                />
                {photo ? <p className="truncate text-[11px] text-amber-200">{photo.name}</p> : null}
              </label>
            ) : null}

            {(error || scanError) && tab === "code" ? (
              <p className="mt-3 rounded-2xl border border-rose-400/30 bg-rose-500/15 px-3 py-2 text-center text-sm text-rose-100">
                {error ?? scanError}
              </p>
            ) : null}
            {scanError && tab === "scan" ? (
              <p className="mt-3 rounded-2xl border border-amber-300/30 bg-amber-400/10 px-3 py-2 text-center text-sm text-amber-100">
                {scanError}
              </p>
            ) : null}
          </div>

          <div className="flex gap-2 border-t border-white/10 bg-black/20 px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button
              variant="outline"
              className="h-12 flex-1 border-white/15 bg-transparent text-white hover:bg-white/10"
              isDisabled={busy}
              onPress={onCancel}
            >
              {t("common.cancel")}
            </Button>
            <Button
              className="h-12 flex-1 bg-amber-400 text-slate-950 hover:bg-amber-300"
              isDisabled={busy || !canSubmit}
              onPress={() => {
                if (needsOtp) {
                  submitCode(code);
                  return;
                }
                onConfirm({ otp: "", photo });
              }}
            >
              {busy ? (
                t("driver.working")
              ) : (
                <>
                  <CheckCircle2 data-icon="inline-start" className="size-5" />
                  {t("driver.proofConfirm")}
                </>
              )}
            </Button>
          </div>
        </m.div>
      </m.div>
    </AnimatePresence>,
    document.body,
  );
}
