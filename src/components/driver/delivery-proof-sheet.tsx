"use client";

import { Camera, KeyRound, X } from "lucide-react";
import { useState, type ReactNode } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import type { DriverDeliveryProofMode } from "@/lib/driver/types";

interface DeliveryProofSheetProps {
  mode: DriverDeliveryProofMode
  busy: boolean
  onCancel: () => void
  onConfirm: (input: { otp: string; photo: File | null }) => void
}

export function DeliveryProofSheet({
  mode,
  busy,
  onCancel,
  onConfirm,
}: DeliveryProofSheetProps): ReactNode {
  const { t } = useLocale();
  const [otp, setOtp] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const needsOtp = mode === "OTP" || mode === "BOTH";
  const needsPhoto = mode === "PHOTO" || mode === "BOTH";

  const canSubmit =
    (!needsOtp || /^\d{4}$/.test(otp.trim())) && (!needsPhoto || photo != null);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 sm:items-center">
      <div className="w-full max-w-md space-y-4 rounded-3xl border border-border bg-background p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-semibold">{t("driver.proofTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("driver.proofHint")}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full p-2 text-muted-foreground hover:bg-muted"
            aria-label={t("common.cancel")}
          >
            <X className="size-4" />
          </button>
        </div>

        {needsOtp ? (
          <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <KeyRound className="size-3.5" />
              {t("driver.proofOtp")}
            </span>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={4}
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 4))}
              className="h-12 w-full rounded-2xl border border-border bg-background px-4 text-center font-heading text-2xl tracking-[0.4em] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              placeholder="••••"
            />
          </label>
        ) : null}

        {needsPhoto ? (
          <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Camera className="size-3.5" />
              {t("driver.proofPhoto")}
            </span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
              className="block w-full text-sm file:mr-3 file:rounded-xl file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary"
            />
            {photo ? (
              <p className="truncate text-[11px] text-foreground">{photo.name}</p>
            ) : null}
          </label>
        ) : null}

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" isDisabled={busy} onPress={onCancel}>
            {t("common.cancel")}
          </Button>
          <Button
            className="flex-1"
            isDisabled={busy || !canSubmit}
            onPress={() => onConfirm({ otp: otp.trim(), photo })}
          >
            {busy ? t("driver.working") : t("driver.proofConfirm")}
          </Button>
        </div>
      </div>
    </div>
  );
}
