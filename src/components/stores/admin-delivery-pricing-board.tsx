"use client";

import { Plus, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/ui/fade-in";
import { GlassCard } from "@/components/ui/glass-card";
import { PageHeader } from "@/components/ui/page-header";
import { saveDeliveryTiersAction } from "@/lib/stores/actions";
import {
  DEFAULT_DELIVERY_TIERS,
  normalizeDeliveryTiers,
  type DeliveryTier,
} from "@/lib/platform/delivery-tiers";
import { formatMoney } from "@/lib/stores/pricing";

const fieldClass =
  "h-9 w-full rounded-lg border border-border bg-background/70 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function AdminDeliveryPricingBoard({
  initialTiers,
}: {
  initialTiers: DeliveryTier[];
}): ReactNode {
  const { t } = useLocale();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [tiers, setTiers] = useState<DeliveryTier[]>(() =>
    normalizeDeliveryTiers(initialTiers),
  );

  const updateTier = (index: number, patch: Partial<DeliveryTier>): void => {
    setTiers((current) =>
      current.map((tier, rowIndex) => (rowIndex === index ? { ...tier, ...patch } : tier)),
    );
  };

  const save = (): void => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("tiersJson", JSON.stringify(tiers));
      const result = await saveDeliveryTiersAction(formData);
      if (!result.ok) {
        setError(result.error ?? "Failed.");
        return;
      }
      setError(null);
      setTiers(normalizeDeliveryTiers(tiers));
      router.refresh();
    });
  };

  return (
    <FadeIn className="space-y-6">
      <PageHeader
        title={t("stores.deliveryPricingTitle")}
        description={t("stores.deliveryPricingDescription")}
        action={
          <Button onPress={save} isDisabled={pending}>
            <Save data-icon="inline-start" />
            {t("common.save")}
          </Button>
        }
      />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <GlassCard hover={false} className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">{t("stores.deliveryPricingHint")}</p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onPress={() =>
                setTiers((current) => [
                  ...current,
                  {
                    fromKm: current[current.length - 1]?.toKm ?? current.length,
                    toKm: null,
                    fee: DEFAULT_DELIVERY_TIERS[0]?.fee ?? 4000,
                  },
                ])
              }
            >
              <Plus className="size-3.5" />
              {t("stores.deliveryTierAdd")}
            </Button>
            <Button variant="outline" onPress={() => setTiers(DEFAULT_DELIVERY_TIERS.map((t) => ({ ...t })))}>
              {t("stores.deliveryTierReset")}
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {tiers.map((tier, index) => (
            <div
              key={`${tier.fromKm}-${index}`}
              className="grid gap-2 rounded-2xl border border-border/70 p-3 sm:grid-cols-[1fr_1fr_1fr_auto]"
            >
              <label className="space-y-1 text-xs font-medium text-muted-foreground">
                {t("stores.deliveryTierFromKm")}
                <input
                  type="number"
                  min={0}
                  step="0.1"
                  value={tier.fromKm}
                  onChange={(event) =>
                    updateTier(index, { fromKm: Number.parseFloat(event.target.value) || 0 })
                  }
                  className={fieldClass}
                />
              </label>
              <label className="space-y-1 text-xs font-medium text-muted-foreground">
                {t("stores.deliveryTierToKm")}
                <input
                  type="number"
                  min={0}
                  step="0.1"
                  value={tier.toKm ?? ""}
                  placeholder={t("stores.deliveryTierOpenEnded")}
                  onChange={(event) => {
                    const raw = event.target.value.trim();
                    updateTier(index, {
                      toKm: raw === "" ? null : Number.parseFloat(raw) || null,
                    });
                  }}
                  className={fieldClass}
                />
              </label>
              <label className="space-y-1 text-xs font-medium text-muted-foreground">
                {t("stores.deliveryTierFee")}
                <input
                  type="number"
                  min={0}
                  step="100"
                  value={tier.fee}
                  onChange={(event) =>
                    updateTier(index, { fee: Number.parseInt(event.target.value, 10) || 0 })
                  }
                  className={fieldClass}
                />
              </label>
              <div className="flex items-end justify-between gap-2 sm:flex-col sm:items-stretch">
                <p className="text-xs font-semibold text-emerald-600">
                  {formatMoney(tier.fee)} {t("menu.currency")}
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  isDisabled={tiers.length <= 1}
                  onPress={() => setTiers((current) => current.filter((_, row) => row !== index))}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </FadeIn>
  );
}
