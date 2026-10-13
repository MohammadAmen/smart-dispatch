"use client";

import { useEffect, useState, type ReactNode } from "react";

import type { CompanyProfile } from "@/lib/finance/company-profile";
import { buildPayoutInvoiceQrPayload } from "@/lib/finance/payout-invoice-qr";
import type { StorePayoutSettlementView } from "@/lib/finance/payouts";
import { formatMoney } from "@/lib/stores/pricing";
import { cn } from "@/lib/utils";

function formatDate(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SY" : "en-GB", {
    dateStyle: "medium",
  }).format(new Date(value));
}

export function PayoutInvoiceDocument({
  company,
  settlement,
  locale,
  labels,
  className,
}: {
  company: CompanyProfile
  settlement: StorePayoutSettlementView
  locale: string
  labels: {
    title: string
    invoice: string
    period: string
    to: string
    from: string
    merchant: string
    phone: string
    address: string
    taxId: string
    regNo: string
    order: string
    date: string
    gross: string
    commission: string
    net: string
    totals: string
    bank: string
    iban: string
    account: string
    note: string
    signaturePlatform: string
    signatureMerchant: string
    generated: string
    qrVerify: string
  }
  className?: string
}): ReactNode {
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const payload = buildPayoutInvoiceQrPayload({
      invoiceNumber: settlement.invoiceNumber,
      settlementId: settlement.id,
      commissionTotal: settlement.commissionTotal,
      storeName: settlement.storeName,
    });
    void (async () => {
      try {
        const QRCode = (await import("qrcode")).default;
        const dataUrl = await QRCode.toDataURL(payload, {
          errorCorrectionLevel: "M",
          margin: 1,
          width: 220,
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
  }, [
    settlement.commissionTotal,
    settlement.id,
    settlement.invoiceNumber,
    settlement.storeName,
  ]);

  return (
    <article
      className={cn(
        "payout-invoice mx-auto w-full max-w-[860px] bg-white text-slate-900 shadow-xl print:max-w-none print:shadow-none",
        className,
      )}
      dir={locale === "ar" ? "rtl" : "ltr"}
    >
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .payout-invoice, .payout-invoice * { visibility: visible !important; }
          .payout-invoice {
            position: absolute !important;
            inset: 0 auto auto 0 !important;
            width: 100% !important;
            margin: 0 !important;
            box-shadow: none !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="border-b border-slate-200 px-8 pt-8 pb-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={company.logoUrl}
              alt={company.tradeName}
              className="h-16 w-16 rounded-2xl object-contain ring-1 ring-slate-200"
            />
            <div>
              <h1 className="font-heading text-2xl font-bold tracking-tight">
                {company.legalName}
              </h1>
              {company.tradeName !== company.legalName ? (
                <p className="text-sm text-slate-500">{company.tradeName}</p>
              ) : null}
              <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">
                {[company.address, company.city, company.country].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>
          <div className="text-end">
            <p className="text-[11px] font-semibold tracking-[0.2em] text-amber-700 uppercase">
              {labels.title}
            </p>
            <p className="mt-1 font-mono text-lg font-bold">{settlement.invoiceNumber}</p>
            <p className="mt-2 text-xs text-slate-500">
              {labels.generated}: {formatDate(settlement.settledAt, locale)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 px-8 py-6 sm:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
          <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
            {labels.from}
          </p>
          <p className="mt-1 font-semibold">{company.legalName}</p>
          <p className="mt-1 text-xs text-slate-600">
            {[company.phone, company.email, company.website].filter(Boolean).join(" · ")}
          </p>
          {company.taxId ? (
            <p className="mt-2 text-xs text-slate-500">
              {labels.taxId}: {company.taxId}
            </p>
          ) : null}
          {company.registrationNumber ? (
            <p className="text-xs text-slate-500">
              {labels.regNo}: {company.registrationNumber}
            </p>
          ) : null}
        </div>
        <div className="rounded-2xl bg-amber-50/80 p-4 ring-1 ring-amber-100">
          <p className="text-[11px] font-semibold tracking-wide text-amber-800 uppercase">
            {labels.to} · {labels.merchant}
          </p>
          <p className="mt-1 font-semibold">{settlement.storeName}</p>
          <p className="mt-1 text-xs text-slate-600">
            {[settlement.storePhone, settlement.storeAddress, settlement.storeCity]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <p className="mt-3 text-xs text-slate-600">
            {labels.period}: {formatDate(settlement.periodFrom, locale)} —{" "}
            {formatDate(settlement.periodTo, locale)}
          </p>
        </div>
      </div>

      <div className="px-8 pb-4">
        <div className="overflow-hidden rounded-2xl ring-1 ring-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-white">
              <tr>
                <th className="px-3 py-2.5 text-start font-medium">{labels.order}</th>
                <th className="px-3 py-2.5 text-start font-medium">{labels.date}</th>
                <th className="px-3 py-2.5 text-end font-medium">{labels.gross}</th>
                <th className="px-3 py-2.5 text-end font-medium">{labels.commission}</th>
                <th className="px-3 py-2.5 text-end font-medium">{labels.net}</th>
              </tr>
            </thead>
            <tbody>
              {settlement.lines.map((line, index) => (
                <tr
                  key={line.id}
                  className={index % 2 === 0 ? "bg-white" : "bg-slate-50/80"}
                >
                  <td className="px-3 py-2 font-mono text-xs">{line.orderNumber}</td>
                  <td className="px-3 py-2 text-xs text-slate-600">
                    {formatDate(line.orderCreatedAt, locale)}
                  </td>
                  <td className="px-3 py-2 text-end tabular-nums">
                    {formatMoney(line.itemsSubtotal)}
                  </td>
                  <td className="px-3 py-2 text-end font-semibold tabular-nums text-amber-800">
                    {formatMoney(line.commissionAmount)}
                    <span className="ms-1 text-[10px] font-normal text-slate-400">
                      ({line.commissionPercentage}%)
                    </span>
                  </td>
                  <td className="px-3 py-2 text-end tabular-nums text-slate-600">
                    {formatMoney(line.storeNetAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-4 px-8 pb-6 sm:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-3 text-xs text-slate-600">
          {(company.bankName || company.bankIban) && (
            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="font-semibold text-slate-800">{labels.bank}</p>
              {company.bankAccountName ? (
                <p className="mt-1">
                  {labels.account}: {company.bankAccountName}
                </p>
              ) : null}
              {company.bankName ? <p>{company.bankName}</p> : null}
              {company.bankIban ? (
                <p className="font-mono">
                  {labels.iban}: {company.bankIban}
                </p>
              ) : null}
            </div>
          )}
          {settlement.note ? (
            <p>
              <span className="font-semibold text-slate-800">{labels.note}: </span>
              {settlement.note}
            </p>
          ) : null}
          {company.invoiceFooter ? (
            <p className="leading-5 text-slate-500">{company.invoiceFooter}</p>
          ) : null}
        </div>

        <div className="rounded-2xl bg-slate-900 p-4 text-white">
          <p className="text-[11px] tracking-wide text-slate-300 uppercase">{labels.totals}</p>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-slate-300">{labels.gross}</span>
              <span className="tabular-nums">{formatMoney(settlement.grossSales)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-300">{labels.net}</span>
              <span className="tabular-nums">{formatMoney(settlement.netPayable)}</span>
            </div>
            <div className="flex justify-between gap-3 border-t border-white/15 pt-2 text-base font-bold text-amber-300">
              <span>{labels.commission}</span>
              <span className="tabular-nums">{formatMoney(settlement.commissionTotal)}</span>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-slate-400">
            {settlement.orderCount} {labels.order}
          </p>
        </div>
      </div>

      <div className="mx-8 mb-6 flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-slate-200 bg-slate-50/80 px-5 py-4">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-amber-800 uppercase">
            {labels.qrVerify}
          </p>
          <p className="mt-1 font-mono text-sm font-semibold text-slate-800">
            {settlement.invoiceNumber}
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {company.tradeName} · {formatMoney(settlement.commissionTotal)}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-2 ring-1 ring-slate-200">
          {qrUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrUrl} alt={labels.qrVerify} className="size-[7.5rem]" />
          ) : (
            <div className="size-[7.5rem] animate-pulse rounded-xl bg-slate-100" />
          )}
        </div>
      </div>

      <div className="grid gap-8 px-8 pt-2 pb-10 sm:grid-cols-2">
        <div className="border-t border-dashed border-slate-300 pt-8 text-center text-xs text-slate-500">
          {labels.signaturePlatform}
        </div>
        <div className="border-t border-dashed border-slate-300 pt-8 text-center text-xs text-slate-500">
          {labels.signatureMerchant}
        </div>
      </div>
    </article>
  );
}
