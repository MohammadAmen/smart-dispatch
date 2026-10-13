"use client";

import { AnimatePresence, m } from "framer-motion";
import { CheckCircle2, ReceiptText, Sparkles, X } from "lucide-react";
import { useId, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";

export function DeliverySuccessOverlay({
  orderNumber,
  onClose,
  onViewInvoice,
}: {
  orderNumber: string
  onClose: () => void
  onViewInvoice: () => void
}): ReactNode {
  const { t } = useLocale();
  const titleId = useId();

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      <m.div
        className="fixed inset-0 z-[220] flex items-end justify-center sm:items-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <button
          type="button"
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#14532d55,transparent_55%),linear-gradient(180deg,#020617ee,#0f172aee)]"
          aria-label={t("common.close")}
          onClick={onClose}
        />

        <m.div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          initial={{ y: 48, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 26 }}
          className="relative z-10 mb-0 w-full max-w-md overflow-hidden rounded-t-[32px] border border-emerald-400/20 bg-[linear-gradient(165deg,#052e16_0%,#020617_48%,#0b1220_100%)] px-6 pt-8 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-white shadow-[0_-40px_100px_-20px_rgba(16,185,129,0.35)] sm:mb-6 sm:rounded-[32px]"
        >
          <div className="pointer-events-none absolute -top-24 left-1/2 size-56 -translate-x-1/2 rounded-full bg-emerald-400/25 blur-3xl" />

          <div className="relative flex flex-col items-center text-center">
            <m.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 380, damping: 16 }}
              className="relative mb-5 flex size-28 items-center justify-center rounded-full bg-emerald-400/15 ring-1 ring-emerald-300/40"
            >
              <CheckCircle2 className="size-14 text-emerald-300" strokeWidth={1.75} />
              <m.span
                className="absolute inset-0 rounded-full border border-emerald-300/35"
                animate={{ scale: [1, 1.28, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </m.div>

            <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.22em] text-amber-300 uppercase">
              <Sparkles className="size-3.5" />
              BEEV
            </p>
            <h2 id={titleId} className="mt-2 font-heading text-[1.75rem] font-bold tracking-tight">
              {t("menu.deliveredCelebrateTitle")}
            </h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-slate-300">
              {t("menu.deliveredCelebrateBody", { order: orderNumber })}
            </p>

            <div className="mt-8 grid w-full gap-2.5">
              <Button
                className="h-13 w-full bg-amber-400 text-slate-950 hover:bg-amber-300"
                onPress={onViewInvoice}
              >
                <ReceiptText data-icon="inline-start" className="size-5" />
                {t("menu.viewReceipt")}
              </Button>
              <Button
                variant="outline"
                className="h-12 w-full border-white/15 bg-transparent text-white hover:bg-white/10"
                onPress={onClose}
              >
                <X data-icon="inline-start" className="size-4" />
                {t("common.close")}
              </Button>
            </div>
          </div>
        </m.div>
      </m.div>
    </AnimatePresence>,
    document.body,
  );
}
