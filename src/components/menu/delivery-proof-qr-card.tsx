"use client";

import { KeyRound, QrCode } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { buildDeliveryProofQrPayload } from "@/lib/finance/delivery-proof";
import { cn } from "@/lib/utils";

export function DeliveryProofQrCard({
  orderNumber,
  code,
  className,
}: {
  orderNumber: string
  code: string
  className?: string
}): ReactNode {
  const { t } = useLocale();
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const payload = buildDeliveryProofQrPayload(orderNumber, code);

    void (async () => {
      try {
        const QRCode = (await import("qrcode")).default;
        const dataUrl = await QRCode.toDataURL(payload, {
          errorCorrectionLevel: "M",
          margin: 1,
          width: 280,
          color: { dark: "#0f172a", light: "#ffffff" },
        });
        if (!cancelled) {
          setQrUrl(dataUrl);
        }
      } catch {
        if (!cancelled) {
          setQrUrl(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code, orderNumber]);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-3xl border border-amber-300/50 bg-gradient-to-b from-amber-50 to-white p-5 text-amber-950 shadow-[0_20px_50px_-28px_rgba(180,83,9,0.55)] dark:border-amber-800/60 dark:from-amber-950/50 dark:to-background dark:text-amber-50",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.18em] uppercase">
          <QrCode className="size-3.5" />
          {t("menu.deliveryCodeTitle")}
        </p>
        <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-amber-800 dark:text-amber-200">
          {orderNumber}
        </span>
      </div>

      <div className="mt-4 flex flex-col items-center gap-4">
        <div className="rounded-2xl bg-white p-3 shadow-inner ring-1 ring-black/5 dark:bg-slate-950">
          {qrUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrUrl}
              alt={t("menu.deliveryCodeTitle")}
              className="size-[200px] sm:size-[220px]"
            />
          ) : (
            <div className="flex size-[200px] items-center justify-center sm:size-[220px]">
              <div className="size-10 animate-pulse rounded-full bg-amber-200/70 dark:bg-amber-900/50" />
            </div>
          )}
        </div>

        <div className="w-full text-center">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-800/80 dark:text-amber-200/80">
            <KeyRound className="size-3.5" />
            {t("menu.deliveryCodeOrEnter")}
          </p>
          <p className="mt-2 font-heading text-4xl font-bold tracking-[0.42em] tabular-nums">
            {code}
          </p>
          <p className="mt-2 text-xs leading-5 text-amber-900/70 dark:text-amber-100/70">
            {t("menu.deliveryCodeHint")}
          </p>
        </div>
      </div>
    </div>
  );
}
