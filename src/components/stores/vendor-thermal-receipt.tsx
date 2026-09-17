"use client";

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
  store: StoreRecord;
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
