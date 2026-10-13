"use client";

import { Building2, FileText, Printer, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type ReactNode } from "react";

import { PayoutInvoiceDocument } from "@/components/finance/payout-invoice-document";
import { useLocale } from "@/components/providers/locale-provider";
import { Button, LinkButton } from "@/components/ui/button";
import { FadeIn } from "@/components/ui/fade-in";
import { GlassCard } from "@/components/ui/glass-card";
import { PageHeader } from "@/components/ui/page-header";
import type { CompanyProfile } from "@/lib/finance/company-profile";
import { settleStorePayoutAction } from "@/lib/finance/payout-actions";
import type { StorePayoutDueRow, StorePayoutSettlementView } from "@/lib/finance/payouts";
import { formatMoney } from "@/lib/stores/pricing";
import { withLocalePrefix } from "@/lib/paths";

export function AdminPayoutsBoard({
  dues,
  settlements,
  company,
}: {
  dues: StorePayoutDueRow[]
  settlements: StorePayoutSettlementView[]
  company: CompanyProfile
}): ReactNode {
  const { t, locale } = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<StorePayoutSettlementView | null>(
    settlements[0] ?? null,
  );

  const totals = useMemo(() => {
    return {
      commission: dues.reduce((sum, row) => sum + row.pendingCommission, 0),
      stores: dues.length,
      orders: dues.reduce((sum, row) => sum + row.pendingCount, 0),
    };
  }, [dues]);

  const invoiceLabels = {
    title: t("payouts.invoiceTitle"),
    invoice: t("payouts.invoice"),
    period: t("payouts.period"),
    to: t("payouts.to"),
    from: t("payouts.from"),
    merchant: t("payouts.merchant"),
    phone: t("company.phone"),
    address: t("company.address"),
    taxId: t("company.taxId"),
    regNo: t("company.regNo"),
    order: t("payouts.order"),
    date: t("payouts.date"),
    gross: t("payouts.gross"),
    commission: t("payouts.commission"),
    net: t("payouts.net"),
    totals: t("payouts.totals"),
    bank: t("company.banking"),
    iban: t("company.iban"),
    account: t("company.bankAccount"),
    note: t("payouts.note"),
    signaturePlatform: t("payouts.signaturePlatform"),
    signatureMerchant: t("payouts.signatureMerchant"),
    generated: t("payouts.generated"),
  };

  const settle = (storeId: string): void => {
    startTransition(async () => {
      const data = new FormData();
      data.set("storeId", storeId);
      const result = await settleStorePayoutAction(data);
      if (!result.ok) {
        setError(result.error ?? t("payouts.settleFailed"));
        return;
      }
      setError(null);
      router.refresh();
    });
  };

  return (
    <FadeIn className="space-y-6">
      <PageHeader
        title={t("payouts.adminTitle")}
        description={t("payouts.adminDescription")}
        action={
          <LinkButton variant="outline" href={withLocalePrefix("/admin/company", locale)}>
            <Building2 data-icon="inline-start" />
            {t("company.title")}
          </LinkButton>
        }
      />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: t("payouts.pendingCommission"), value: formatMoney(totals.commission) },
          { label: t("payouts.pendingStores"), value: String(totals.stores) },
          { label: t("payouts.pendingOrders"), value: String(totals.orders) },
        ].map((kpi) => (
          <GlassCard key={kpi.label} hover={false} className="space-y-1 p-4">
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
            <p className="font-heading text-xl font-bold tabular-nums">{kpi.value}</p>
          </GlassCard>
        ))}
      </div>

      <GlassCard hover={false} className="space-y-3">
        <div className="flex items-center gap-2">
          <Wallet className="size-4 text-amber-600" />
          <h2 className="font-heading text-base font-semibold">{t("payouts.duesTitle")}</h2>
        </div>
        <div className="space-y-2">
          {dues.map((row) => (
            <div
              key={row.storeId}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/70 px-3 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{row.storeName}</p>
                <p className="text-[11px] text-muted-foreground">
                  {row.pendingCount} {t("payouts.order")} · {t("payouts.gross")}{" "}
                  {formatMoney(row.pendingGross)} · {t("payouts.storeKeeps")}{" "}
                  {formatMoney(row.pendingNet)}
                </p>
              </div>
              <p className="font-heading text-lg font-bold tabular-nums text-amber-700 dark:text-amber-300">
                {formatMoney(row.pendingCommission)}
              </p>
              <Button size="sm" isDisabled={pending} onPress={() => settle(row.storeId)}>
                {t("payouts.settle")}
              </Button>
            </div>
          ))}
          {dues.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("payouts.noDues")}</p>
          ) : null}
        </div>
      </GlassCard>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <GlassCard hover={false} className="space-y-3">
          <h2 className="font-heading text-base font-semibold">{t("payouts.historyTitle")}</h2>
          <div className="space-y-2">
            {settlements.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => setSelected(row)}
                className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-start transition ${
                  selected?.id === row.id
                    ? "border-amber-400/60 bg-amber-50/70 dark:bg-amber-950/30"
                    : "border-border/70 hover:bg-muted/40"
                }`}
              >
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{row.storeName}</p>
                  <p className="truncate font-mono text-[11px] text-muted-foreground">
                    {row.invoiceNumber}
                  </p>
                </div>
                <span className="text-sm font-semibold tabular-nums text-amber-700 dark:text-amber-300">
                  {formatMoney(row.commissionTotal)}
                </span>
              </button>
            ))}
            {settlements.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("payouts.noHistory")}</p>
            ) : null}
          </div>
        </GlassCard>

        <div className="space-y-3">
          {selected ? (
            <>
              <div className="no-print flex justify-end">
                <Button
                  onPress={() => {
                    window.print();
                  }}
                >
                  <Printer data-icon="inline-start" />
                  {t("payouts.printInvoice")}
                </Button>
              </div>
              <PayoutInvoiceDocument
                company={company}
                settlement={selected}
                locale={locale}
                labels={invoiceLabels}
              />
            </>
          ) : (
            <GlassCard hover={false} className="p-8 text-sm text-muted-foreground">
              {t("payouts.selectSettlement")}
            </GlassCard>
          )}
        </div>
      </div>
    </FadeIn>
  );
}
