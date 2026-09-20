"use client";

import { AnimatePresence, m } from "framer-motion";
import {
  CalendarDays,
  Camera,
  FileText,
  ImagePlus,
  LoaderCircle,
  Sparkles,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { CUSTOM_ORDER_MIN_LEAD_MS } from "@/lib/stores/custom-order";
import { composeDeliveryAddress, type MenuCheckoutDraft } from "@/lib/stores/menu-checkout";
import { rememberTrackingToken } from "@/lib/stores/menu-track-store";
import { customerOrderTrackingPath } from "@/lib/stores/public-url";
import { cn } from "@/lib/utils";

const fieldClass =
  "h-11 w-full rounded-2xl border border-border/80 bg-background/55 px-3 text-sm outline-none backdrop-blur-md focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const accentFill =
  "brand-sheen text-primary-foreground shadow-lg shadow-primary/30";

function toLocalInput(date: Date): string {
  const pad = (value: number): string => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatSchedule(value: string, locale: string): string {
  const [datePart, timePart] = value.split("T");
  if (!datePart || !timePart) {
    return value;
  }
  const [year, month, day] = datePart.split("-").map(Number);
  const [hours, minutes] = timePart.split(":").map(Number);
  const date = new Date(year, (month ?? 1) - 1, day ?? 1, hours ?? 0, minutes ?? 0);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function SpecialOrderSheet({
  open,
  storeId,
  storeName,
  draft,
  locating,
  pending,
  error,
  onClose,
  onChange,
  onLocate,
  onError,
}: {
  open: boolean;
  storeId: string;
  storeName: string;
  draft: MenuCheckoutDraft;
  locating: boolean;
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onChange: (patch: Partial<MenuCheckoutDraft>) => void;
  onLocate: () => void;
  onError: (message: string | null) => void;
}): ReactNode {
  const { locale, t } = useLocale();
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const minSchedule = useMemo(
    () => toLocalInput(new Date(Date.now() + CUSTOM_ORDER_MIN_LEAD_MS)),
    [open],
  );

  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const onFile = (event: ChangeEvent<HTMLInputElement>): void => {
    const next = event.target.files?.[0] ?? null;
    setFile(next);
    setPreview((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return next ? URL.createObjectURL(next) : null;
    });
  };

  const submit = async (): Promise<void> => {
    const addressText = composeDeliveryAddress(draft);
    if (!draft.phone.trim() || !addressText) {
      onError(t("menu.addressMissing"));
      return;
    }
    if (notes.trim().length < 8) {
      onError(t("menu.customNotesMissing"));
      return;
    }
    if (!scheduledDate) {
      onError(t("menu.customScheduleMissing"));
      return;
    }

    setSubmitting(true);
    onError(null);
    try {
      const form = new FormData();
      form.set("storeId", storeId);
      form.set("phone", draft.phone);
      form.set("addressText", addressText);
      form.set("customNotes", notes.trim());
      form.set("scheduledDate", scheduledDate);
      if (draft.latitude != null) {
        form.set("latitude", String(draft.latitude));
      }
      if (draft.longitude != null) {
        form.set("longitude", String(draft.longitude));
      }
      if (file) {
        form.set("image", file);
      }
      const response = await fetch("/api/menu/custom-orders", { method: "POST", body: form });
      const body = (await response.json()) as {
        ok?: boolean;
        error?: string;
        orderNumber?: string;
        trackingToken?: string;
      };
      if (!body.ok || !body.trackingToken) {
        onError(body.error ?? t("menu.placeFailed"));
        return;
      }
      rememberTrackingToken(body.trackingToken);
      onClose();
      router.push(customerOrderTrackingPath(body.trackingToken));
    } catch {
      onError(t("menu.placeFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const steps = [
    { icon: Camera, label: t("menu.customStepPhoto") },
    { icon: FileText, label: t("menu.customStepNotes") },
    { icon: CalendarDays, label: t("menu.customStepSchedule") },
  ] as const;

  return (
    <AnimatePresence>
      {open ? (
        <m.div
          className="fixed inset-0 z-50 flex items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-background/55 backdrop-blur-sm"
            aria-label={t("common.cancel")}
            onClick={onClose}
          />
          <m.section
            role="dialog"
            aria-modal="true"
            initial={{ y: 48 }}
            animate={{ y: 0 }}
            exit={{ y: 56 }}
            transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
            className="glass-strong relative z-10 flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border-x border-t"
          >
            <div className="brand-sheen-soft pointer-events-none absolute inset-x-0 top-0 h-28" />
            <div className="relative mx-auto mt-2 h-1.5 w-12 rounded-full bg-border" />
            <div className="relative flex items-start justify-between gap-3 px-5 pb-2 pt-4">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.16em] text-primary uppercase">
                  {storeName}
                </p>
                <h2 className="font-heading text-lg font-semibold">{t("menu.customDrawerTitle")}</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">{t("menu.customHint")}</p>
              </div>
              <Button variant="ghost" size="icon-sm" onPress={onClose}>
                <X />
              </Button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pb-6">
              <ol className="grid grid-cols-3 gap-2">
                {steps.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <li
                      key={step.label}
                      className="flex flex-col items-center gap-1.5 rounded-2xl border border-white/10 bg-background/40 px-2 py-2.5 text-center backdrop-blur-md"
                    >
                      <span className={cn("flex size-8 items-center justify-center rounded-full", accentFill)}>
                        <Icon className="size-4" />
                      </span>
                      <span className="text-[10px] leading-tight font-semibold">
                        {index + 1}. {step.label}
                      </span>
                    </li>
                  );
                })}
              </ol>

              <label className="block space-y-2">
                <span className="text-xs font-medium text-muted-foreground">{t("menu.customImage")}</span>
                <span className="relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-primary/40 bg-primary/8">
                  {preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={preview} alt="" className="h-44 w-full object-cover" />
                  ) : (
                    <span className="flex h-44 flex-col items-center justify-center gap-2 px-4 text-center text-muted-foreground">
                      <span className={cn("flex size-12 items-center justify-center rounded-2xl", accentFill)}>
                        <ImagePlus className="size-6" />
                      </span>
                      <span className="text-xs font-medium">{t("menu.customImageHint")}</span>
                    </span>
                  )}
                  {preview ? (
                    <span className="absolute inset-x-3 bottom-3 inline-flex items-center justify-center gap-1.5 rounded-full bg-background/85 px-3 py-1.5 text-[11px] font-semibold backdrop-blur-md">
                      <Camera className="size-3.5" />
                      {t("menu.customChangePhoto")}
                    </span>
                  ) : null}
                  <input type="file" accept="image/*" className="sr-only" onChange={onFile} />
                </span>
              </label>

              <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
                {t("menu.customNotes")}
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder={t("menu.customNotesHint")}
                  rows={4}
                  className={cn(fieldClass, "h-auto py-2.5")}
                />
              </label>

              <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
                {t("menu.customSchedule")}
                <span className="relative block">
                  <span
                    className={cn(
                      fieldClass,
                      "pointer-events-none flex items-center gap-2 pe-3",
                      scheduledDate ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    <span className={cn("flex size-8 items-center justify-center rounded-xl", accentFill)}>
                      <CalendarDays className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                      {scheduledDate
                        ? formatSchedule(scheduledDate, locale)
                        : t("menu.customPickDate")}
                    </span>
                  </span>
                  <input
                    type="datetime-local"
                    min={minSchedule}
                    value={scheduledDate}
                    onChange={(event) => setScheduledDate(event.target.value)}
                    className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                  />
                </span>
              </label>

              <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
                {t("menu.phone")}
                <input
                  value={draft.phone}
                  onChange={(event) => onChange({ phone: event.target.value })}
                  inputMode="tel"
                  className={fieldClass}
                />
              </label>
              <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
                {t("menu.street")}
                <input
                  value={draft.street}
                  onChange={(event) => onChange({ street: event.target.value })}
                  placeholder={t("menu.streetHint")}
                  className={fieldClass}
                />
              </label>
              <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
                {t("menu.apartment")}
                <input
                  value={draft.apartment}
                  onChange={(event) => onChange({ apartment: event.target.value })}
                  placeholder={t("menu.apartmentHint")}
                  className={fieldClass}
                />
              </label>

              <Button variant="outline" className="w-full rounded-2xl" onPress={onLocate} isDisabled={locating}>
                {locating ? <LoaderCircle className="size-4 animate-spin" /> : null}
                {t("menu.useGps")}
              </Button>

              {error ? <p className="text-sm text-destructive">{error}</p> : null}

              <Button
                className="brand-sheen h-12 w-full rounded-2xl text-sm text-primary-foreground shadow-lg shadow-primary/30 hover:opacity-90"
                onPress={() => {
                  void submit();
                }}
                isDisabled={submitting || pending}
              >
                {submitting ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                {t("menu.customSubmit")}
              </Button>
            </div>
          </m.section>
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}
