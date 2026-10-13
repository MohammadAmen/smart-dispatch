"use client";

import { FileText, Printer, Wallet } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { PayoutInvoiceDocument } from "@/components/finance/payout-invoice-document";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/ui/fade-in";
import { GlassCard } from "@/components/ui/glass-card";
import { PageHeader } from "@/components/ui/page-header";
import type { CompanyProfile } from "@/lib/finance/company-profile";
import type { StorePayoutDueRow, StorePayoutLineView, StorePayoutSettlementView } from "@/lib/finance/payouts";
import { formatMoney } from "@/lib/stores/pricing";

export function VendorPayoutsBoard({
  storeName,
  pending,
  pendingLines,
  settlements,
  company,
}: {
  storeName: string
  pending: StorePayoutDueRow | null
  pendingLines: StorePayoutLineView[]
  settlements: StorePayoutSettlementView[]
  company: CompanyProfile
}): ReactNode {
  const { t, locale } = useLocale();
  const [selected, setSelected] = useState<StorePayoutSettlementView | null>(
    settlements[0] ?? null,
  );

  const invoiceLabels = useMemo(
    () => ({
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
    }),
    [t],
  );

  return (
    <FadeIn className="space-y-6">
      <PageHeader
        title={t("payouts.vendorTitle")}
        description={t("payouts.vendorDescription", { store: storeName })}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <GlassCard hover={false} className="space-y-1 p-4">
          <p className="text-xs text-muted-foreground">{t("payouts.pendingNet")}</p>
          <p className="font-heading text-2xl font-bold tabular-nums text-amber-700 dark:text-amber-300">
            {formatMoney(pending?.pendingNet ?? 0)}
          </p>
        </GlassCard>
        <GlassCard hover={false} className="space-y-1 p-4">
          <p className="text-xs text-muted-foreground">{t("payouts.pendingOrders")}</p>
          <p className="font-heading text-2xl font-bold tabular-nums">
            {pending?.pendingCount ?? 0}
          </p>
        </GlassCard>
        <GlassCard hover={false} className="space-y-1 p-4">
          <p className="text-xs text-muted-foreground">{t("payouts.commission")}</p>
          <p className="font-heading text-2xl font-bold tabular-nums">
            {formatMoney(pending?.pendingCommission ?? 0)}
          </p>
        </GlassCard>
      </div>

      <GlassCard hover={false} className="space-y-3">
        <div className="flex items-center gap-2">
          <Wallet className="size-4 text-amber-600" />
          <h2 className="font-heading text-base font-semibold">{t("payouts.pendingDetails")}</h2>
        </div>
        <div className="overflow-x-auto rounded-2xl ring-1 ring-border/70">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-start font-medium">{t("payouts.order")}</th>
                <th className="px-3 py-2 text-start font-medium">{t("payouts.date")}</th>
                <th className="px-3 py-2 text-end font-medium">{t("payouts.gross")}</th>
                <th className="px-3 py-2 text-end font-medium">{t("payouts.commission")}</th>
                <th className="px-3 py-2 text-end font-medium">{t("payouts.net")}</th>
              </tr>
            </thead>
            <tbody>
              {pendingLines.map((line) => (
                <tr key={line.id} className="border-t border-border/60">
                  <td className="px-3 py-2 font-mono text-xs">{line.orderNumber}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {new Intl.DateTimeFormat(locale === "ar" ? "ar-SY" : "en-GB", {
                      dateStyle: "medium",
                    }).format(new Date(line.orderCreatedAt))}
                  </td>
                  <td className="px-3 py-2 text-end tabular-nums">{formatMoney(line.itemsSubtotal)}</td>
                  <td className="px-3 py-2 text-end tabular-nums text-muted-foreground">
                    {formatMoney(line.commissionAmount)}
                  </td>
                  <td className="px-3 py-2 text-end font-semibold tabular-nums">
                    {formatMoney(line.storeNetAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {pendingLines.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">{t("payouts.noPendingLines")}</p>
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
                  <p className="truncate font-mono text-xs">{row.invoiceNumber}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {row.orderCount} {t("payouts.order")}
                  </p>
                </div>
                <span className="text-sm font-semibold tabular-nums">
                  {formatMoney(row.netPayable)}
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
                <Button onPress={() => window.print()}>
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
