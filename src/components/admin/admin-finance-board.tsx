"use client";

import { Save, ShieldAlert, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/ui/fade-in";
import { GlassCard } from "@/components/ui/glass-card";
import { PageHeader } from "@/components/ui/page-header";
import {
  markDriverDepositPaidAction,
  refundDriverDepositAction,
  resolveOrderDisputeAction,
  saveFinanceConfigAction,
  updateStoreCommissionAction,
} from "@/lib/finance/actions";
import type { PlatformFinanceConfig } from "@/lib/finance/types";
import { formatMoney } from "@/lib/stores/pricing";
import { cn } from "@/lib/utils";

const fieldClass =
  "h-10 w-full rounded-xl border border-border bg-background/70 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

type FinanceDriverRow = {
  id: string
  name: string
  securityDeposit: number
  securityDepositPaidAt: string | null
  securityDepositRefundedAt: string | null
  cashBlockedAt: string | null
};

export function AdminFinanceBoard({
  config,
  snapshot,
  stores,
  drivers,
}: {
  config: PlatformFinanceConfig
  snapshot: {
    fieldCashHeld: number
    pendingStorePayouts: number
    platformNetProfit: number
    riskBufferAccrued: number
    cashBlockedDrivers: number
  }
  stores: Array<{ id: string; name: string; commissionPercentage: number }>
  drivers: FinanceDriverRow[]
}): ReactNode {
  const { t } = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [form, setForm] = useState(config);
  const [storeRates, setStoreRates] = useState(stores);
  const [dispute, setDispute] = useState({
    orderId: "",
    faultParty: "DRIVER",
    reason: "",
    mealCost: 0,
  });

  const saveConfig = (): void => {
    startTransition(async () => {
      const data = new FormData();
      data.set("driverSecurityDeposit", String(form.driverSecurityDeposit));
      data.set("driverCashLimit", String(form.driverCashLimit));
      data.set(
        "requireDepositBeforeOffers",
        form.requireDepositBeforeOffers ? "1" : "0",
      );
      data.set("riskBufferPercentage", String(form.riskBufferPercentage));
      data.set("defaultStoreCommissionPercentage", String(form.defaultStoreCommissionPercentage));
      data.set("deliveryProofMode", form.deliveryProofMode);
      const result = await saveFinanceConfigAction(data);
      if (!result.ok) {
        setError(result.error ?? t("finance.saveFailed"));
        return;
      }
      setError(null);
      if (result.config) {
        setForm(result.config);
      }
      router.refresh();
    });
  };

  const saveStoreRate = (storeId: string, commissionPercentage: number): void => {
    startTransition(async () => {
      const data = new FormData();
      data.set("storeId", storeId);
      data.set("commissionPercentage", String(commissionPercentage));
      const result = await updateStoreCommissionAction(data);
      if (!result.ok) {
        setError(result.error ?? t("finance.saveFailed"));
        return;
      }
      setError(null);
      router.refresh();
    });
  };

  const runDeposit = (driverId: string, kind: "pay" | "refund"): void => {
    startTransition(async () => {
      const data = new FormData();
      data.set("driverId", driverId);
      const result =
        kind === "pay"
          ? await markDriverDepositPaidAction(data)
          : await refundDriverDepositAction(data);
      if (!result.ok) {
        setError(result.error ?? t("finance.saveFailed"));
        return;
      }
      setError(null);
      router.refresh();
    });
  };

  const submitDispute = (): void => {
    startTransition(async () => {
      const data = new FormData();
      data.set("orderId", dispute.orderId.trim());
      data.set("faultParty", dispute.faultParty);
      data.set("reason", dispute.reason.trim());
      data.set("mealCost", String(dispute.mealCost));
      const result = await resolveOrderDisputeAction(data);
      if (!result.ok) {
        setError(result.error ?? t("finance.disputeFailed"));
        setNotice(null);
        return;
      }
      setError(null);
      setNotice(t("finance.disputeOk"));
      setDispute({ orderId: "", faultParty: "DRIVER", reason: "", mealCost: 0 });
      router.refresh();
    });
  };

  const kpis = [
    { label: t("finance.fieldCash"), value: snapshot.fieldCashHeld },
    { label: t("finance.storePayouts"), value: snapshot.pendingStorePayouts },
    { label: t("finance.platformNet"), value: snapshot.platformNetProfit },
    { label: t("finance.riskBuffer"), value: snapshot.riskBufferAccrued },
  ];

  return (
    <FadeIn className="space-y-6">
      <PageHeader
        title={t("finance.title")}
        description={t("finance.description")}
        action={
          <Button onPress={saveConfig} isDisabled={pending}>
            <Save data-icon="inline-start" />
            {t("common.save")}
          </Button>
        }
      />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {notice ? <p className="text-sm text-emerald-700 dark:text-emerald-300">{notice}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <GlassCard key={kpi.label} hover={false} className="space-y-1 p-4">
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
            <p className="font-heading text-xl font-bold tabular-nums">
              {formatMoney(kpi.value)}
            </p>
          </GlassCard>
        ))}
      </div>

      {snapshot.cashBlockedDrivers > 0 ? (
        <div className="flex items-center gap-2 rounded-2xl border border-amber-300/50 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          <ShieldAlert className="size-4 shrink-0" />
          {t("finance.blockedDrivers", { count: snapshot.cashBlockedDrivers })}
        </div>
      ) : null}

      <GlassCard hover={false} className="space-y-4">
        <div className="flex items-center gap-2">
          <Wallet className="size-4 text-amber-600" />
          <h2 className="font-heading text-base font-semibold">{t("finance.governance")}</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
            {t("finance.securityDeposit")}
            <input
              type="number"
              min={0}
              step={1}
              value={form.driverSecurityDeposit}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  driverSecurityDeposit: Number(event.target.value),
                }))
              }
              className={fieldClass}
            />
          </label>
          <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
            {t("finance.cashLimit")}
            <input
              type="number"
              min={0}
              step={1}
              value={form.driverCashLimit}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  driverCashLimit: Number(event.target.value),
                }))
              }
              className={fieldClass}
            />
            <span className="block text-[11px] font-normal text-muted-foreground">
              {t("finance.cashLimitHint")}
            </span>
          </label>
          <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground sm:col-span-2">
            <input
              type="checkbox"
              checked={form.requireDepositBeforeOffers}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  requireDepositBeforeOffers: event.target.checked,
                }))
              }
              className="size-4 rounded border-border"
            />
            {t("finance.requireDepositBeforeOffers")}
          </label>
          <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
            {t("finance.riskBufferPct")}
            <input
              type="number"
              min={0}
              max={25}
              step={0.1}
              value={form.riskBufferPercentage}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  riskBufferPercentage: Number(event.target.value),
                }))
              }
              className={fieldClass}
            />
          </label>
          <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
            {t("finance.defaultCommission")}
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={form.defaultStoreCommissionPercentage}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  defaultStoreCommissionPercentage: Number(event.target.value),
                }))
              }
              className={fieldClass}
            />
          </label>
          <label className="space-y-1.5 text-xs font-medium text-muted-foreground sm:col-span-2">
            {t("finance.deliveryProof")}
            <select
              value={form.deliveryProofMode}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  deliveryProofMode: event.target.value as PlatformFinanceConfig["deliveryProofMode"],
                }))
              }
              className={fieldClass}
            >
              <option value="OTP">{t("finance.proofOtp")}</option>
              <option value="PHOTO">{t("finance.proofPhoto")}</option>
              <option value="BOTH">{t("finance.proofBoth")}</option>
              <option value="NONE">{t("finance.proofNone")}</option>
            </select>
          </label>
        </div>
        <p className="text-xs leading-5 text-muted-foreground">{t("finance.lockHint")}</p>
      </GlassCard>

      <GlassCard hover={false} className="space-y-3">
        <h2 className="font-heading text-base font-semibold">{t("finance.storeCommissions")}</h2>
        <p className="text-xs text-muted-foreground">{t("finance.storeCommissionsHint")}</p>
        <div className="space-y-2">
          {storeRates.map((store) => (
            <div
              key={store.id}
              className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 px-3 py-2"
            >
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{store.name}</span>
              <input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={store.commissionPercentage}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  setStoreRates((current) =>
                    current.map((row) =>
                      row.id === store.id ? { ...row, commissionPercentage: value } : row,
                    ),
                  );
                }}
                className={cn(fieldClass, "w-24")}
              />
              <span className="text-xs text-muted-foreground">%</span>
              <Button
                size="sm"
                variant="outline"
                isDisabled={pending}
                onPress={() => saveStoreRate(store.id, store.commissionPercentage)}
              >
                {t("common.save")}
              </Button>
            </div>
          ))}
          {storeRates.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("finance.noStores")}</p>
          ) : null}
        </div>
      </GlassCard>

      <GlassCard hover={false} className="space-y-3">
        <h2 className="font-heading text-base font-semibold">{t("finance.depositsTitle")}</h2>
        <p className="text-xs text-muted-foreground">{t("finance.depositsHint")}</p>
        <div className="space-y-2">
          {drivers.map((driver) => {
            const refunded = Boolean(driver.securityDepositRefundedAt);
            const paid = Boolean(driver.securityDepositPaidAt) && !refunded;
            const awaiting = driver.securityDeposit > 0 && !paid && !refunded;
            return (
              <div
                key={driver.id}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{driver.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {t("finance.depositAmount")}: {formatMoney(driver.securityDeposit)}
                    {driver.cashBlockedAt ? ` · ${t("finance.cashBlocked")}` : ""}
                    {" · "}
                    {refunded
                      ? t("finance.depositRefunded")
                      : paid
                        ? t("finance.depositPaid")
                        : awaiting
                          ? t("finance.depositPending")
                          : t("finance.depositPaid")}
                  </p>
                </div>
                {awaiting ? (
                  <Button
                    size="sm"
                    variant="outline"
                    isDisabled={pending}
                    onPress={() => runDeposit(driver.id, "pay")}
                  >
                    {t("finance.markPaid")}
                  </Button>
                ) : null}
                {paid ? (
                  <Button
                    size="sm"
                    variant="outline"
                    isDisabled={pending}
                    onPress={() => runDeposit(driver.id, "refund")}
                  >
                    {t("finance.refundDeposit")}
                  </Button>
                ) : null}
              </div>
            );
          })}
          {drivers.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("finance.noStores")}</p>
          ) : null}
        </div>
      </GlassCard>

      <GlassCard hover={false} className="space-y-3">
        <h2 className="font-heading text-base font-semibold">{t("finance.disputeTitle")}</h2>
        <p className="text-xs text-muted-foreground">{t("finance.disputeHint")}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
            {t("finance.disputeOrderId")}
            <input
              value={dispute.orderId}
              onChange={(event) =>
                setDispute((current) => ({ ...current, orderId: event.target.value }))
              }
              className={fieldClass}
            />
          </label>
          <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
            {t("finance.disputeFault")}
            <select
              value={dispute.faultParty}
              onChange={(event) =>
                setDispute((current) => ({ ...current, faultParty: event.target.value }))
              }
              className={fieldClass}
            >
              <option value="DRIVER">{t("finance.faultDriver")}</option>
              <option value="STORE">{t("finance.faultStore")}</option>
              <option value="FORCE_MAJEURE">{t("finance.faultForce")}</option>
              <option value="CUSTOMER">{t("finance.faultCustomer")}</option>
              <option value="PLATFORM">{t("finance.faultPlatform")}</option>
            </select>
          </label>
          <label className="space-y-1.5 text-xs font-medium text-muted-foreground sm:col-span-2">
            {t("finance.disputeReason")}
            <input
              value={dispute.reason}
              onChange={(event) =>
                setDispute((current) => ({ ...current, reason: event.target.value }))
              }
              className={fieldClass}
            />
          </label>
          <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
            {t("finance.disputeMealCost")}
            <input
              type="number"
              min={0}
              step={1}
              value={dispute.mealCost}
              onChange={(event) =>
                setDispute((current) => ({
                  ...current,
                  mealCost: Number(event.target.value),
                }))
              }
              className={fieldClass}
            />
          </label>
        </div>
        <Button isDisabled={pending} onPress={submitDispute}>
          {t("finance.disputeSubmit")}
        </Button>
      </GlassCard>
    </FadeIn>
  );
}
