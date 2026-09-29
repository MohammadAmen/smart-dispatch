"use client";

import { X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import type { VendorOrderRecord } from "@/lib/stores/order-types";
import { formatMoney, PRICE_CURRENCY } from "@/lib/stores/pricing";
import { customerOrderTrackingPath } from "@/lib/stores/public-url";
import { dineInReceiptTableLabel, resolveReceiptFooterNote } from "@/lib/stores/receipt-footer";
import type { StoreRecord } from "@/lib/stores/types";
import { cn } from "@/lib/utils";

type PaperWidth = 58 | 80;

interface ReceiptStore {
  name: string;
  phone: string | null;
  logoUrl: string | null;
  address: string | null;
  city: string | null;
  receiptFooterNote: string | null;
}

function formatPrintWhen(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SY" : "en-GB", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function receiptUrl(token: string | null): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  if (token) {
    return `${origin}${customerOrderTrackingPath(token)}`;
  }
  return origin;
}

function ReceiptPaper({
  store,
  order,
  qr,
  printedAt,
  paperMm,
}: {
  store: ReceiptStore;
  order: VendorOrderRecord;
  qr: string | null;
  printedAt: string;
  paperMm: PaperWidth;
}): ReactNode {
  const { t } = useLocale();
  const dineIn = order.fulfillment === "DINE_IN";
  const subtotal = order.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const deliveryFee = dineIn ? 0 : order.deliveryFee;
  const discount = 0;
  const total = Math.max(0, subtotal + deliveryFee - discount);
  const tableText = dineInReceiptTableLabel(order.tableLabel, order.addressText);
  const serviceLine = dineIn
    ? t("vendor.receipt.dineIn", { table: tableText || "—" })
    : t("vendor.receipt.deliveryOrder");
  const courierLine = dineIn
    ? null
    : order.driverName?.trim()
      ? t("vendor.receipt.courier", {
          name: order.driverName.trim(),
          phone: order.driverPhone?.trim() || "—",
        })
      : t("vendor.receipt.courierPending");
  const footerNote = resolveReceiptFooterNote(store.receiptFooterNote);
  const addressLine = [store.address, store.city].filter(Boolean).join(" · ");

  return (
    <article
      className={cn(
        "thermal-receipt-paper mx-auto p-2 font-mono text-xs leading-snug text-black",
        paperMm === 58 ? "w-[58mm] max-w-[58mm]" : "w-[80mm] max-w-[80mm]",
      )}
    >
      <header className="space-y-0.5 text-center">
        {store.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={store.logoUrl} alt="" className="mx-auto mb-1 h-9 w-9 object-contain" />
        ) : null}
        <h1 className="text-sm font-bold tracking-wide break-words">{store.name}</h1>
        {store.phone || order.storePhone ? <p>{store.phone || order.storePhone}</p> : null}
        {addressLine ? <p className="break-words">{addressLine}</p> : null}
        <p className="pt-1 font-semibold break-words">{serviceLine}</p>
        {courierLine ? <p className="break-words">{courierLine}</p> : null}
        <p>{t("vendor.receipt.order", { number: order.orderNumber })}</p>
      </header>

      <div className="my-2 border-b border-dashed border-black" />

      <table className="w-full table-fixed border-collapse text-[11px]">
        <thead>
          <tr className="text-start">
            <th className="w-[18%] pb-1 font-semibold">{t("vendor.receipt.qty")}</th>
            <th className="w-[52%] pb-1 font-semibold">{t("vendor.receipt.item")}</th>
            <th className="w-[30%] pb-1 text-end font-semibold">{t("vendor.receipt.amount")}</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.id}>
              <td className="align-top">{item.quantity}</td>
              <td className="px-1 align-top break-words">{item.name}</td>
              <td className="text-end align-top whitespace-nowrap">
                {formatMoney(item.unitPrice * item.quantity)} {PRICE_CURRENCY}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="my-2 border-b border-dashed border-black" />

      <div className="space-y-0.5 text-[11px]">
        <div className="flex justify-between gap-2">
          <span>{t("vendor.receipt.subtotal")}</span>
          <span className="whitespace-nowrap">
            {formatMoney(subtotal)} {PRICE_CURRENCY}
          </span>
        </div>
        {discount > 0 ? (
          <div className="flex justify-between gap-2">
            <span>{t("vendor.receipt.discount")}</span>
            <span className="whitespace-nowrap">
              -{formatMoney(discount)} {PRICE_CURRENCY}
            </span>
          </div>
        ) : null}
        {deliveryFee > 0 ? (
          <div className="flex justify-between gap-2">
            <span>{t("menu.deliveryFee")}</span>
            <span className="whitespace-nowrap">
              {formatMoney(deliveryFee)} {PRICE_CURRENCY}
            </span>
          </div>
        ) : null}
        <div className="flex justify-between gap-2 pt-1 text-sm font-black">
          <span>{t("vendor.receipt.total")}</span>
          <span className="whitespace-nowrap">
            {formatMoney(total)} {PRICE_CURRENCY}
          </span>
        </div>
      </div>

      <div className="my-2 border-b border-dashed border-black" />

      <footer className="space-y-2 text-center">
        {qr ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qr} alt="" className="mx-auto size-14" />
        ) : null}
        <p>{t("vendor.receipt.printedAt", { when: printedAt })}</p>
        <p className="font-semibold break-words">{footerNote}</p>
      </footer>
    </article>
  );
}

export function VendorThermalReceipt({
  store,
  order,
  onClose,
}: {
  store: StoreRecord;
  order: VendorOrderRecord;
  onClose: () => void;
}): ReactNode {
  const { t, locale } = useLocale();
  const [qr, setQr] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [paperMm, setPaperMm] = useState<PaperWidth>(80);
  const printedAt = formatPrintWhen(new Date().toISOString(), locale);

  useEffect(() => {
    let cancelled = false;
    const run = async (): Promise<void> => {
      try {
        const QRCode = (await import("qrcode")).default;
        const dataUrl = await QRCode.toDataURL(receiptUrl(order.trackingToken), {
          width: 160,
          margin: 0,
          errorCorrectionLevel: "M",
          color: { dark: "#000000", light: "#ffffff" },
        });
        if (!cancelled) {
          setQr(dataUrl);
        }
      } catch {
        if (!cancelled) {
          setQr(null);
        }
      }
      if (!cancelled) {
        setReady(true);
        window.setTimeout(() => {
          if (!cancelled) {
            window.print();
          }
        }, 80);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [order.trackingToken]);

  return (
    <>
      <style>{`@media print { @page { size: ${paperMm}mm auto; margin: 0; } }`}</style>
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 print:hidden">
        <button
          type="button"
          className="absolute inset-0 bg-background/60 backdrop-blur-sm"
          aria-label={t("common.close")}
          onClick={onClose}
        />
        <div className="relative z-10 w-full max-w-sm space-y-3 rounded-2xl border border-border bg-white p-4 text-black shadow-xl">
          <div className="flex gap-1 rounded-full bg-muted/80 p-0.5 print:hidden">
            {([80, 58] as const).map((width) => (
              <button
                key={width}
                type="button"
                onClick={() => setPaperMm(width)}
                className={cn(
                  "flex-1 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  paperMm === width ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
                )}
              >
                {width}mm
              </button>
            ))}
          </div>
          <ReceiptPaper store={store} order={order} qr={qr} printedAt={printedAt} paperMm={paperMm} />
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onPress={onClose}>
              {t("common.close")}
            </Button>
            <Button onPress={() => window.print()} isDisabled={!ready}>
              {t("vendor.reprintReceipt")}
            </Button>
          </div>
        </div>
      </div>
      <div className="thermal-receipt" data-paper={paperMm} aria-hidden>
        <ReceiptPaper store={store} order={order} qr={qr} printedAt={printedAt} paperMm={paperMm} />
      </div>
    </>
  );
}

export function CustomerReceiptPreview({
  order,
  onClose,
}: {
  order: VendorOrderRecord;
  onClose: () => void;
}): ReactNode {
  const { t, locale } = useLocale();
  const [qr, setQr] = useState<string | null>(null);
  const printedAt = formatPrintWhen(new Date().toISOString(), locale);
  const storeName = order.storeName?.trim() || t("brand.name");
  const storePhone = order.storePhone;
  const addressLine = [order.storeAddress, order.storeCity].filter(Boolean).join(" · ");
  const dineIn = order.fulfillment === "DINE_IN";
  const subtotal = order.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const deliveryFee = dineIn ? 0 : order.deliveryFee;
  const total = Math.max(0, subtotal + deliveryFee);
  const tableText = dineInReceiptTableLabel(order.tableLabel, order.addressText);
  const serviceLine = dineIn
    ? t("vendor.receipt.dineIn", { table: tableText || "—" })
    : t("vendor.receipt.deliveryOrder");
  const courierLine = dineIn
    ? null
    : order.driverName?.trim()
      ? t("vendor.receipt.courier", {
          name: order.driverName.trim(),
          phone: order.driverPhone?.trim() || "—",
        })
      : t("vendor.receipt.courierPending");
  const footerNote = resolveReceiptFooterNote(order.receiptFooterNote);

  useEffect(() => {
    let cancelled = false;
    const run = async (): Promise<void> => {
      try {
        const QRCode = (await import("qrcode")).default;
        const dataUrl = await QRCode.toDataURL(receiptUrl(order.trackingToken), {
          width: 180,
          margin: 1,
          errorCorrectionLevel: "M",
          color: { dark: "#1a1610", light: "#ffffff" },
        });
        if (!cancelled) {
          setQr(dataUrl);
        }
      } catch {
        if (!cancelled) {
          setQr(null);
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [order.trackingToken]);

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/55 backdrop-blur-[2px]"
        aria-label={t("common.close")}
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[min(92dvh,820px)] w-full max-w-md flex-col overflow-hidden rounded-t-[1.75rem] border border-slate-200/80 bg-[#faf8f4] shadow-[0_28px_80px_-28px_rgba(15,23,42,0.55)] sm:rounded-[1.75rem]">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200/70 bg-white/90 px-4 py-3.5 backdrop-blur-md">
          <div className="min-w-0">
            <p className="font-heading text-lg font-bold tracking-tight text-slate-900">
              {t("menu.receiptTitle")}
            </p>
            <p className="truncate text-xs text-slate-500">
              {t("vendor.receipt.order", { number: order.orderNumber })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
            aria-label={t("common.close")}
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3.5 py-4 sm:px-5">
          <article className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-sm">
            {/* Store brand */}
            <div className="border-b border-slate-100 bg-linear-to-b from-slate-50 to-white px-5 pb-4 pt-5 text-center">
              {order.storeLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={order.storeLogoUrl}
                  alt=""
                  className="mx-auto mb-3 size-14 rounded-2xl object-cover ring-1 ring-slate-200/80 shadow-sm"
                />
              ) : (
                <span className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-amber-400/15 text-lg font-bold text-amber-700 ring-1 ring-amber-400/30">
                  {storeName.slice(0, 1)}
                </span>
              )}
              <h1 className="font-heading text-xl font-bold text-slate-900">{storeName}</h1>
              {storePhone ? (
                <p className="mt-1 text-sm tabular-nums text-slate-600" dir="ltr">
                  {storePhone}
                </p>
              ) : null}
              {addressLine ? (
                <p className="mt-1 text-xs leading-relaxed text-slate-500">{addressLine}</p>
              ) : null}
            </div>

            {/* Meta */}
            <div className="space-y-2 border-b border-slate-100 px-5 py-4">
              <p className="text-sm font-semibold text-slate-800">{serviceLine}</p>
              {courierLine ? <p className="text-xs leading-relaxed text-slate-500">{courierLine}</p> : null}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-slate-700">
                  {order.orderNumber}
                </span>
                <span className="text-[11px] text-slate-400">
                  {t("vendor.receipt.printedAt", { when: printedAt })}
                </span>
              </div>
            </div>

            {/* Line items */}
            <div className="px-5 py-4">
              <div className="mb-3 grid grid-cols-[2.5rem_minmax(0,1fr)_auto] gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                <span>{t("vendor.receipt.qty")}</span>
                <span>{t("vendor.receipt.item")}</span>
                <span className="text-end">{t("vendor.receipt.amount")}</span>
              </div>
              <ul className="space-y-3">
                {order.items.map((item) => (
                  <li
                    key={item.id}
                    className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-start gap-2 border-b border-dashed border-slate-100 pb-3 last:border-0 last:pb-0"
                  >
                    <span className="inline-flex size-8 items-center justify-center rounded-xl bg-amber-400/15 text-sm font-bold text-amber-800">
                      {item.quantity}
                    </span>
                    <span className="min-w-0 pt-1 text-sm font-medium leading-snug text-slate-800">
                      {item.name}
                    </span>
                    <span className="pt-1 text-sm font-semibold tabular-nums text-slate-900 whitespace-nowrap">
                      {formatMoney(item.unitPrice * item.quantity)}{" "}
                      <span className="text-xs font-medium text-slate-500">{PRICE_CURRENCY}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Totals */}
            <div className="space-y-2.5 border-t border-slate-100 bg-slate-50/80 px-5 py-4">
              <div className="flex items-center justify-between gap-3 text-sm text-slate-600">
                <span>{t("vendor.receipt.subtotal")}</span>
                <span className="font-medium tabular-nums text-slate-800 whitespace-nowrap">
                  {formatMoney(subtotal)} {PRICE_CURRENCY}
                </span>
              </div>
              {deliveryFee > 0 ? (
                <div className="flex items-center justify-between gap-3 text-sm text-slate-600">
                  <span>{t("menu.deliveryFee")}</span>
                  <span className="font-medium tabular-nums text-slate-800 whitespace-nowrap">
                    {formatMoney(deliveryFee)} {PRICE_CURRENCY}
                  </span>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-900 px-3.5 py-3 text-white shadow-sm">
                <span className="text-sm font-semibold">{t("vendor.receipt.total")}</span>
                <span className="text-base font-bold tabular-nums whitespace-nowrap">
                  {formatMoney(total)} {PRICE_CURRENCY}
                </span>
              </div>
            </div>

            {/* QR + footer */}
            <footer className="space-y-3 border-t border-slate-100 px-5 py-5 text-center">
              {qr ? (
                <div className="mx-auto inline-flex rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qr} alt="" className="size-[5.5rem]" />
                </div>
              ) : (
                <div className="mx-auto size-[5.5rem] animate-pulse rounded-2xl bg-slate-100" />
              )}
              <p className="text-xs font-medium leading-relaxed text-slate-500">{footerNote}</p>
            </footer>
          </article>
        </div>
      </div>
    </div>
  );
}

