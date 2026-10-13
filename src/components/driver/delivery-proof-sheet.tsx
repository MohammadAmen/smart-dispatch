"use client";

import { AnimatePresence, m } from "framer-motion";
import {
  Camera,
  CheckCircle2,
  Keyboard,
  QrCode,
  ScanLine,
  Sparkles,
  X,
} from "lucide-react";
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
import { decodeQrFromImageFile, decodeQrFromVideo } from "@/lib/finance/decode-qr";
import {
  DELIVERY_PROOF_CODE_LENGTH,
  isValidDeliveryProofCode,
  parseDeliveryProofQrPayload,
} from "@/lib/finance/delivery-proof";
import { cn } from "@/lib/utils";

type ProofTab = "scan" | "code";
type ProofPhase = "form" | "success";

interface DeliveryProofSheetProps {
  mode: DriverDeliveryProofMode
  orderNumber: string
  busy: boolean
  error?: string | null
  onCancel: () => void
  onConfirm: (input: { otp: string; photo: File | null }) => Promise<boolean> | boolean
  onDone: () => void
}

export function DeliveryProofSheet({
  mode,
  orderNumber,
  busy,
  error,
  onCancel,
  onConfirm,
  onDone,
}: DeliveryProofSheetProps): ReactNode {
  const { t } = useLocale();
  const titleId = useId();
  const needsOtp = mode === "OTP" || mode === "BOTH";
  const needsPhoto = mode === "PHOTO" || mode === "BOTH";
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<ProofPhase>("form");
  const [tab, setTab] = useState<ProofTab>("scan");
  const [digits, setDigits] = useState<string[]>(
    () => Array.from({ length: DELIVERY_PROOF_CODE_LENGTH }, () => ""),
  );
  const [photo, setPhoto] = useState<File | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanReady, setScanReady] = useState(false);
  const [liveAttempted, setLiveAttempted] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [preferCapture, setPreferCapture] = useState(true);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const captureRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const submittedRef = useRef(false);

  const code = digits.join("");
  const canSubmit =
    (!needsOtp || isValidDeliveryProofCode(code)) && (!needsPhoto || photo != null);

  useEffect(() => {
    setMounted(true);
    // Capacitor / Android WebView: live getUserMedia hangs and often hands off to
    // the system QR scanner. Capture + jsQR is the reliable path there.
    const cap = (
      window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }
    ).Capacitor;
    const native =
      Boolean(cap?.isNativePlatform?.()) ||
      /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    setPreferCapture(native);
    return () => setMounted(false);
  }, []);

  const stopCamera = useCallback((): void => {
    if (timerRef.current != null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setScanReady(false);
  }, []);

  const applyCode = useCallback(
    async (raw: string): Promise<void> => {
      if (submittedRef.current || busy || phase === "success") {
        return;
      }
      const parsed = parseDeliveryProofQrPayload(raw);
      const nextCode = parsed?.code ?? raw.replace(/\D/g, "");
      if (!isValidDeliveryProofCode(nextCode)) {
        setScanError(t("driver.proofInvalidOtp"));
        submittedRef.current = false;
        return;
      }
      if (
        parsed?.orderNumber &&
        parsed.orderNumber !== orderNumber &&
        !orderNumber.includes(parsed.orderNumber)
      ) {
        setScanError(t("driver.proofWrongOrder"));
        submittedRef.current = false;
        return;
      }

      submittedRef.current = true;
      stopCamera();
      const visual = nextCode.slice(0, DELIVERY_PROOF_CODE_LENGTH).split("");
      while (visual.length < DELIVERY_PROOF_CODE_LENGTH) {
        visual.push("");
      }
      setDigits(visual);
      setScanError(null);

      const ok = await onConfirm({ otp: nextCode, photo });
      if (ok) {
        setPhase("success");
      } else {
        submittedRef.current = false;
      }
    },
    [busy, onConfirm, orderNumber, phase, photo, stopCamera, t],
  );

  useEffect(() => {
    if (!mounted || phase !== "form" || tab !== "scan" || !needsOtp || busy || preferCapture) {
      stopCamera();
      return;
    }

    let cancelled = false;
    const start = async (): Promise<void> => {
      setScanError(null);
      setLiveAttempted(true);
      if (!navigator.mediaDevices?.getUserMedia) {
        setPreferCapture(true);
        return;
      }

      const timeout = window.setTimeout(() => {
        if (!cancelled && !streamRef.current) {
          // WebView often never resolves — fall back to native capture.
          setPreferCapture(true);
          stopCamera();
        }
      }, 2500);

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        window.clearTimeout(timeout);
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) {
          setPreferCapture(true);
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        video.setAttribute("playsinline", "true");
        video.setAttribute("webkit-playsinline", "true");
        video.muted = true;
        video.playsInline = true;
        video.srcObject = stream;
        await video.play().catch(() => undefined);
        if (cancelled) {
          return;
        }
        setScanReady(true);

        const canvas = canvasRef.current ?? document.createElement("canvas");
        canvasRef.current = canvas;
        timerRef.current = window.setInterval(() => {
          if (cancelled || submittedRef.current || !videoRef.current) {
            return;
          }
          const raw = decodeQrFromVideo(videoRef.current, canvas);
          if (raw) {
            void applyCode(raw);
          }
        }, 280);
      } catch {
        window.clearTimeout(timeout);
        if (!cancelled) {
          setScanReady(false);
          setPreferCapture(true);
        }
      }
    };

    void start();
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [applyCode, busy, mounted, needsOtp, phase, preferCapture, stopCamera, tab]);

  const onCaptureFile = async (file: File | null): Promise<void> => {
    if (!file) {
      return;
    }
    setCapturing(true);
    setScanError(null);
    try {
      const raw = await decodeQrFromImageFile(file);
      if (!raw) {
        setScanError(t("driver.proofScanNoQr"));
        return;
      }
      await applyCode(raw);
    } catch {
      setScanError(t("driver.proofScanNoQr"));
    } finally {
      setCapturing(false);
    }
  };

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
        window.setTimeout(() => {
          void applyCode(joined);
        }, 60);
      }
      return next;
    });
    inputRefs.current[Math.min(index + chars.length, DELIVERY_PROOF_CODE_LENGTH - 1)]?.focus();
  };

  if (!mounted) {
    return null;
  }

  return createPortal(
    <AnimatePresence mode="wait">
      <m.div
        key="proof-root"
        className="fixed inset-0 z-[240] flex items-end justify-center sm:items-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md" />

        <m.div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          initial={{ y: 40, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          className="relative z-10 flex max-h-[min(94dvh,740px)] w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] border border-white/10 bg-[linear-gradient(165deg,#0b1220_0%,#020617_55%,#111827_100%)] text-white shadow-[0_-30px_90px_-20px_rgba(0,0,0,0.7)] sm:rounded-[28px]"
        >
          {phase === "success" ? (
            <div className="flex flex-col items-center px-6 py-10 text-center">
              <m.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 320, damping: 18 }}
                className="relative mb-5 flex size-24 items-center justify-center rounded-full bg-emerald-400/15 ring-1 ring-emerald-300/40"
              >
                <CheckCircle2 className="size-12 text-emerald-300" />
                <m.span
                  className="absolute inset-0 rounded-full border border-emerald-300/30"
                  animate={{ scale: [1, 1.25, 1], opacity: [0.55, 0, 0.55] }}
                  transition={{ duration: 1.8, repeat: Infinity }}
                />
              </m.div>
              <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.2em] text-amber-300 uppercase">
                <Sparkles className="size-3.5" />
                BEEV
              </p>
              <h2 id={titleId} className="mt-2 font-heading text-2xl font-bold">
                {t("driver.proofSuccessTitle")}
              </h2>
              <p className="mt-2 max-w-sm text-sm leading-6 text-slate-300">
                {t("driver.proofSuccessBody", { order: orderNumber })}
              </p>
              <Button
                className="mt-8 h-13 w-full max-w-xs bg-amber-400 text-slate-950 hover:bg-amber-300"
                onPress={onDone}
              >
                {t("driver.proofSuccessDone")}
              </Button>
            </div>
          ) : (
            <>
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
                    {preferCapture ? (
                      <div className="relative overflow-hidden rounded-3xl bg-[radial-gradient(circle_at_30%_20%,rgba(251,191,36,0.18),transparent_45%),linear-gradient(160deg,#0f172a,#020617)] px-5 py-8 text-center ring-1 ring-white/10">
                        <div className="mx-auto mb-4 flex size-20 items-center justify-center rounded-[1.75rem] bg-amber-400/15 ring-1 ring-amber-300/35">
                          <QrCode className="size-10 text-amber-300" />
                        </div>
                        <p className="font-heading text-lg font-semibold">{t("driver.proofScanCaptureTitle")}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-300">
                          {t("driver.proofScanUseCapture")}
                        </p>
                        <div className="pointer-events-none mx-auto mt-6 h-28 w-28 rounded-3xl border-2 border-dashed border-amber-300/50" />
                      </div>
                    ) : (
                      <div className="relative overflow-hidden rounded-3xl bg-black ring-1 ring-white/10">
                        <video
                          ref={videoRef}
                          muted
                          playsInline
                          autoPlay
                          className="aspect-[3/4] w-full object-cover"
                        />
                        <canvas ref={canvasRef} className="hidden" />
                        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_36%,rgba(2,6,23,0.6)_100%)]" />
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                          <div className="relative size-48 rounded-3xl border-2 border-amber-300/80">
                            <m.div
                              className="absolute inset-x-3 h-0.5 bg-amber-300/90"
                              animate={{ top: ["14%", "86%", "14%"] }}
                              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                            />
                          </div>
                        </div>
                        {!scanReady && liveAttempted ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/55 px-6 text-center text-sm text-slate-200">
                            <p>{t("driver.proofScanStarting")}</p>
                            <p className="text-xs text-slate-400">{t("driver.proofScanUseCapture")}</p>
                          </div>
                        ) : null}
                      </div>
                    )}

                    <input
                      ref={captureRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null;
                        event.target.value = "";
                        void onCaptureFile(file);
                      }}
                    />
                    <Button
                      className="h-13 w-full bg-amber-400 text-slate-950 hover:bg-amber-300"
                      isDisabled={busy || capturing}
                      onPress={() => captureRef.current?.click()}
                    >
                      <Camera data-icon="inline-start" className="size-5" />
                      {capturing ? t("driver.proofScanDecoding") : t("driver.proofScanCapture")}
                    </Button>
                    {!preferCapture ? (
                      <button
                        type="button"
                        className="w-full text-center text-xs text-slate-400 underline-offset-2 hover:underline"
                        onClick={() => {
                          stopCamera();
                          setPreferCapture(true);
                        }}
                      >
                        {t("driver.proofScanUseCapture")}
                      </button>
                    ) : null}
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
                  </label>
                ) : null}

                {(error || scanError) ? (
                  <p className="mt-3 rounded-2xl border border-rose-400/30 bg-rose-500/15 px-3 py-2 text-center text-sm text-rose-100">
                    {error ?? scanError}
                  </p>
                ) : null}
              </div>

              {tab === "code" || needsPhoto ? (
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
                      void applyCode(code);
                    }}
                  >
                    {busy ? t("driver.working") : t("driver.proofConfirm")}
                  </Button>
                </div>
              ) : (
                <div className="border-t border-white/10 px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
                  <Button
                    variant="outline"
                    className="h-12 w-full border-white/15 bg-transparent text-white hover:bg-white/10"
                    isDisabled={busy}
                    onPress={onCancel}
                  >
                    {t("common.cancel")}
                  </Button>
                </div>
              )}
            </>
          )}
        </m.div>
      </m.div>
    </AnimatePresence>,
    document.body,
  );
}
