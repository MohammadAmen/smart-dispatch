"use client";

import { m } from "framer-motion";
import type { ReactNode } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { PulseDot } from "@/components/ui/pulse-dot";
import { cn } from "@/lib/utils";
import type { DriverDutyStatus } from "@/lib/driver/types";

interface DriverDutySwitchProps {
  status: DriverDutyStatus;
  disabled?: boolean;
  onChange: (status: DriverDutyStatus) => void;
}

export function DriverDutySwitch({
  status,
  disabled = false,
  onChange,
}: DriverDutySwitchProps): ReactNode {
  const { t } = useLocale();
  const available = status === "AVAILABLE";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={available}
      aria-label={t("driver.toggleDuty")}
      disabled={disabled}
      onClick={() => onChange(available ? "OFFLINE" : "AVAILABLE")}
      className={cn(
        "relative flex h-14 w-[9.5rem] shrink-0 touch-manipulation items-center rounded-full border-2 px-1.5 transition-colors",
        available
          ? "border-success/80 bg-success/20 shadow-[0_0_28px_-6px_oklch(0.72_0.19_155/0.85)]"
          : "border-border bg-muted/80",
      )}
    >
      <m.span
        layout
        transition={{ type: "spring", stiffness: 420, damping: 32 }}
        className={cn(
          "flex size-11 items-center justify-center rounded-full",
          available ? "ms-auto bg-success" : "me-auto bg-muted-foreground",
        )}
      >
        <PulseDot tone={available ? "success" : "muted"} className="size-3" />
      </m.span>
      <span className="sr-only">
        {available ? t("driver.available") : t("driver.offline")}
      </span>
    </button>
  );
}
