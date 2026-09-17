"use client";

import { Printer } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent, type ReactNode } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/ui/fade-in";
import { GlassCard } from "@/components/ui/glass-card";
import { PageHeader } from "@/components/ui/page-header";
import { DEFAULT_RECEIPT_FOOTER_NOTE, resolveReceiptFooterNote } from "@/lib/stores/receipt-footer";
import type { StoreRecord } from "@/lib/stores/types";
import { saveVendorReceiptFooterAction } from "@/lib/stores/vendor-settings-actions";

const fieldClass =
  "h-10 w-full rounded-xl border border-border bg-background/70 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function VendorSettingsBoard({ store }: { store: StoreRecord | null }): ReactNode {
  const { t } = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [note, setNote] = useState(() =>
    store ? resolveReceiptFooterNote(store.receiptFooterNote) : DEFAULT_RECEIPT_FOOTER_NOTE,
  );

  if (!store) {
    return (
      <FadeIn>
        <PageHeader title={t("vendor.settings")} description={t("vendor.noStore")} />
      </FadeIn>
    );
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const formData = new FormData();
    formData.set("storeId", store.id);
    formData.set("receiptFooterNote", note);
    startTransition(async () => {
      const result = await saveVendorReceiptFooterAction(formData);
      if (!result.ok) {
        setSaved(false);
        setError(result.error ?? "Failed.");
        return;
      }
      setError(null);
      setSaved(true);
      setNote(result.receiptFooterNote ?? resolveReceiptFooterNote(note));
      router.refresh();
    });
  };

  return (
    <FadeIn className="space-y-6">
      <PageHeader title={t("vendor.settings")} description={t("vendor.settingsDesc")} />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <GlassCard hover={false} className="space-y-4">
        <div className="flex items-start gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
            <Printer className="size-5" />
          </span>
          <div>
            <h2 className="font-heading text-base font-semibold">{t("vendor.receiptFooterNote")}</h2>
            <p className="text-xs text-muted-foreground">{t("vendor.receiptFooterNoteHint")}</p>
          </div>
        </div>
        <form className="space-y-3" onSubmit={handleSubmit}>
          <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
            {t("vendor.receiptFooterNote")}
            <input
              value={note}
              maxLength={255}
              onChange={(event) => {
                setNote(event.target.value);
                setSaved(false);
              }}
              placeholder={DEFAULT_RECEIPT_FOOTER_NOTE}
              className={fieldClass}
            />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" isDisabled={pending}>
              {t("vendor.saveSettings")}
            </Button>
            {saved ? <p className="text-sm text-success">{t("vendor.settingsSaved")}</p> : null}
          </div>
        </form>
      </GlassCard>
    </FadeIn>
  );
}
