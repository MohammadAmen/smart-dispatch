"use client";

import { AnimatePresence, m } from "framer-motion";
import { Download, Printer, QrCode, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";

function menuHref(path: string): string {
  const origin = window.location.origin.replace(/\/$/, "");
  return `${origin}${path}`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function downloadPng(href: string, filename: string): void {
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.click();
}

export interface MenuQrTarget {
  title: string;
  filename: string;
  path: string;
}

export function MenuQrModal({
  target,
  onClose,
}: {
  target: MenuQrTarget | null;
  onClose: () => void;
}): ReactNode {
  const { t } = useLocale();
  const [qr, setQr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!target) {
      setQr(null);
      setError(null);
      setWorking(false);
      return;
    }

    let cancelled = false;
    setWorking(true);
    setError(null);
    setQr(null);

    void (async () => {
      try {
        const QRCode = (await import("qrcode")).default;
        const dataUrl = await QRCode.toDataURL(menuHref(target.path), {
          width: 1024,
          margin: 2,
          errorCorrectionLevel: "M",
          color: { dark: "#0f172a", light: "#ffffff" },
        });
        if (!cancelled) {
          setQr(dataUrl);
        }
      } catch {
        if (!cancelled) {
          setError(t("stores.qrFailed"));
        }
      } finally {
        if (!cancelled) {
          setWorking(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [target, t]);

  const printQr = (): void => {
    if (!qr || !target) {
      return;
    }
    const win = window.open("", "_blank", "width=480,height=720");
    if (!win) {
      return;
    }
    win.document.write(`<!doctype html><html><head><title>${escapeHtml(target.title)}</title>
      <style>
        body{font-family:Tahoma,Arial,sans-serif;text-align:center;padding:28px;color:#0f172a;background:#fff}
        img{width:280px;height:280px}
        h1{font-size:22px;margin:12px 0 6px}
        p{color:#475569;font-size:13px;margin:4px 0}
      </style></head><body>
      <p>${escapeHtml(t("stores.menuQr"))}</p>
      <h1>${escapeHtml(target.title)}</h1>
      <img src="${qr}" alt="QR" />
      <p>${escapeHtml(t("stores.scanHint"))}</p>
      </body></html>`);
    win.document.close();
    win.focus();
    window.setTimeout(() => win.print(), 250);
  };

  return (
    <AnimatePresence>
      {target ? (
        <m.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-background/55 backdrop-blur-sm"
            aria-label={t("common.close")}
            onClick={onClose}
          />
          <m.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="menu-qr-title"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full max-w-sm"
          >
            <GlassCard hover={false}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <QrCode className="size-4" />
                  </span>
                  <div>
                    <h2 id="menu-qr-title" className="text-sm font-semibold">
                      {t("stores.menuQr")}
                    </h2>
                    <p className="text-xs text-muted-foreground">{target.title}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon-sm" aria-label={t("common.close")} onPress={onClose}>
                  <X />
                </Button>
              </div>

              <div className="mt-4 flex flex-col items-center gap-3">
                {working ? (
                  <p className="text-sm text-muted-foreground">{t("stores.qrGenerating")}</p>
                ) : null}
                {error ? (
                  <p className="text-sm text-destructive" role="alert">
                    {error}
                  </p>
                ) : null}
                {qr ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qr}
                      alt={t("stores.menuQr")}
                      className="size-56 rounded-2xl border border-border/70 bg-white p-3"
                    />
                    <p className="text-center text-xs text-muted-foreground">{t("stores.menuQrHint")}</p>
                    <p className="text-center text-xs text-muted-foreground">{t("stores.scanHint")}</p>
                    <div className="flex w-full flex-wrap justify-center gap-2">
                      <Button
                        onPress={() => {
                          downloadPng(qr, target.filename);
                        }}
                      >
                        <Download data-icon="inline-start" />
                        {t("stores.downloadQr")}
                      </Button>
                      <Button variant="outline" onPress={printQr}>
                        <Printer data-icon="inline-start" />
                        {t("stores.printQr")}
                      </Button>
                    </div>
                  </>
                ) : null}
              </div>
            </GlassCard>
          </m.div>
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}
