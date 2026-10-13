"use client";

import { Building2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent, type ReactNode } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/ui/fade-in";
import { GlassCard } from "@/components/ui/glass-card";
import { PageHeader } from "@/components/ui/page-header";
import { saveCompanyProfileAction } from "@/lib/finance/payout-actions";
import type { CompanyProfile } from "@/lib/finance/company-profile";

const fieldClass =
  "h-10 w-full rounded-xl border border-border bg-background/70 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function AdminCompanyBoard({ company }: { company: CompanyProfile }): ReactNode {
  const { t } = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(company);
  const [preview, setPreview] = useState(company.logoUrl);

  const save = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    data.set("logoUrl", form.logoUrl);
    startTransition(async () => {
      const result = await saveCompanyProfileAction(data);
      if (!result.ok) {
        setError(result.error ?? t("company.saveFailed"));
        return;
      }
      setError(null);
      if (result.company) {
        setForm(result.company);
        setPreview(result.company.logoUrl);
      }
      router.refresh();
    });
  };

  const set =
    (key: keyof CompanyProfile) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
      const value = event.target.value;
      setForm((current) => ({ ...current, [key]: value }));
      if (key === "logoUrl") {
        setPreview(value.trim() || company.logoUrl);
      }
    };

  return (
    <FadeIn className="space-y-6">
      <PageHeader title={t("company.title")} description={t("company.description")} />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <form onSubmit={save} className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <GlassCard hover={false} className="space-y-4">
          <div className="flex items-center gap-2">
            <Building2 className="size-4 text-amber-600" />
            <h2 className="font-heading text-base font-semibold">{t("company.identity")}</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["legalName", t("company.legalName")],
                ["tradeName", t("company.tradeName")],
                ["taxId", t("company.taxId")],
                ["registrationNumber", t("company.regNo")],
                ["phone", t("company.phone")],
                ["email", t("company.email")],
                ["website", t("company.website")],
                ["city", t("company.city")],
                ["country", t("company.country")],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="space-y-1.5 text-xs font-medium text-muted-foreground">
                {label}
                <input name={key} value={form[key]} onChange={set(key)} className={fieldClass} />
              </label>
            ))}
            <label className="space-y-1.5 text-xs font-medium text-muted-foreground sm:col-span-2">
              {t("company.address")}
              <input name="address" value={form.address} onChange={set("address")} className={fieldClass} />
            </label>
            <label className="space-y-1.5 text-xs font-medium text-muted-foreground sm:col-span-2">
              {t("company.invoiceFooter")}
              <textarea
                name="invoiceFooter"
                value={form.invoiceFooter}
                onChange={set("invoiceFooter")}
                rows={3}
                className="w-full rounded-xl border border-border bg-background/70 px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </label>
          </div>

          <h3 className="pt-2 font-heading text-sm font-semibold">{t("company.banking")}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["bankName", t("company.bankName")],
                ["bankAccountName", t("company.bankAccount")],
                ["bankIban", t("company.iban")],
              ] as const
            ).map(([key, label]) => (
              <label
                key={key}
                className={`space-y-1.5 text-xs font-medium text-muted-foreground ${key === "bankIban" ? "sm:col-span-2" : ""}`}
              >
                {label}
                <input name={key} value={form[key]} onChange={set(key)} className={fieldClass} />
              </label>
            ))}
          </div>

          <div className="flex justify-end">
            <Button type="submit" isDisabled={pending}>
              <Save data-icon="inline-start" />
              {t("common.save")}
            </Button>
          </div>
        </GlassCard>

        <GlassCard hover={false} className="space-y-4">
          <h2 className="font-heading text-base font-semibold">{t("company.logo")}</h2>
          <div className="flex justify-center rounded-2xl border border-border/70 bg-muted/30 p-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt={form.tradeName} className="h-28 w-28 object-contain" />
          </div>
          <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
            {t("company.logoUrl")}
            <input name="logoUrl" value={form.logoUrl} onChange={set("logoUrl")} className={fieldClass} />
          </label>
          <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
            {t("company.logoUpload")}
            <input name="logo" type="file" accept="image/jpeg,image/png,image/webp,image/gif" className={fieldClass} />
          </label>
          <p className="text-xs leading-5 text-muted-foreground">{t("company.logoHint")}</p>
        </GlassCard>
      </form>
    </FadeIn>
  );
}
