"use client";

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
        "relative flex h-12 w-[11.5rem] shrink-0 touch-manipulation items-center rounded-full border-2 px-1.5 transition-colors",
        available
          ? "border-emerald-500/80 bg-emerald-500/18 shadow-[0_0_28px_-6px_oklch(0.72_0.19_155/0.85)]"
          : "border-rose-400/50 bg-rose-500/10",
      )}
    >
      <span
        className={cn(
          "pointer-events-none absolute inset-x-3 text-[11px] font-bold tracking-wide uppercase",
          available ? "start-3 text-emerald-800 dark:text-emerald-200" : "end-3 text-rose-700 dark:text-rose-200",
        )}
      >
        {available ? t("driver.available") : t("driver.offline")}
      </span>
      <span
        className={cn(
          "relative z-10 flex size-9 items-center justify-center rounded-full transition-transform duration-300",
          available ? "ms-auto bg-emerald-500" : "me-auto bg-rose-400",
        )}
      >
        <PulseDot tone={available ? "success" : "destructive"} className="size-3" />
      </span>
    </button>
  );
}
