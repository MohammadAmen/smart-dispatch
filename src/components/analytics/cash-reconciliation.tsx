"use client";

import { Banknote, Check } from "lucide-react";
import { AnimatePresence, m } from "framer-motion";
import type { ReactNode } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { formatCount, formatJod } from "@/lib/analytics/format";
import type { CashPendingRow } from "@/lib/analytics/types";

interface CashReconciliationProps {
  rows: CashPendingRow[];
  settlingId: string | null;
  onSettle: (driverId: string) => void;
}

export function CashReconciliation({
  rows,
  settlingId,
  onSettle,
}: CashReconciliationProps): ReactNode {
  const { t, locale } = useLocale();

  if (rows.length === 0) {
    return (
      <m.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center gap-2 py-8 text-sm text-muted-foreground"
      >
        <Check className="size-4 text-success" />
        {t("analytics.cash.empty")}
      </m.p>
    );
  }

  return (
    <div className="space-y-2">
      <AnimatePresence initial={false}>
        {rows.map((row) => (
          <m.div
            key={row.driverId}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: locale === "ar" ? 24 : -24 }}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/40 px-4 py-3"
          >
            <div className="min-w-[140px]">
              <p className="font-semibold">{row.name}</p>
              <p className="font-mono text-[11px] text-muted-foreground">
                {row.vehicleType}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
              <span className="text-muted-foreground">
                {t("analytics.cash.orders")}:{" "}
                <span className="font-medium text-foreground">
                  {formatCount(row.orderCount, locale)}
                </span>
              </span>
              <span className="font-semibold text-warning-foreground dark:text-warning">
                {formatJod(row.amount, locale)}
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {new Date(row.lastDeliveryAt).toLocaleString(
                  locale === "ar" ? "ar-JO" : "en-GB",
                  { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" },
                )}
              </span>
            </div>
            <Button
              size="sm"
              className="h-9 touch-manipulation"
              isDisabled={settlingId === row.driverId}
              onPress={() => onSettle(row.driverId)}
            >
              <Banknote data-icon="inline-start" />
              {settlingId === row.driverId
                ? t("analytics.cash.working")
                : t("analytics.cash.settle")}
            </Button>
          </m.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
