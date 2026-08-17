"use client";

import { m } from "framer-motion";
import { ChevronLeft, Truck } from "lucide-react";
import type { ReactNode } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { PulseDot } from "@/components/ui/pulse-dot";
import type { DriverProfile } from "@/lib/driver/types";
import { cn } from "@/lib/utils";

interface DriverPickerProps {
  drivers: DriverProfile[];
  onSelect: (driverId: string) => void;
}

const statusTone: Record<DriverProfile["status"], "success" | "warning" | "muted"> = {
  AVAILABLE: "success",
  BUSY: "warning",
  OFFLINE: "muted",
};

export function DriverPicker({ drivers, onSelect }: DriverPickerProps): ReactNode {
  const { t, dir } = useLocale();

  return (
    <div className="flex min-h-dvh flex-col bg-background px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <p className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
        {t("driver.kicker")}
      </p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight">
        {t("driver.chooseProfile")}
      </h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {t("driver.chooseHint")}
      </p>

      <ul className="mt-6 flex flex-col gap-3">
        {drivers.map((driver, index) => (
          <m.li
            key={driver.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
          >
            <button
              type="button"
              onClick={() => onSelect(driver.id)}
              className="glass-strong flex min-h-20 w-full touch-manipulation items-center gap-4 rounded-3xl p-4 text-start"
            >
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15">
                <Truck className="size-6 text-primary" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-lg font-bold">
                  {driver.name}
                </span>
                <span className="mt-0.5 flex items-center gap-2 font-mono text-xs text-muted-foreground">
                  {driver.vehicleType}
                  <PulseDot tone={statusTone[driver.status]} />
                  {t(`status.driver.${driver.status}`)}
                </span>
              </span>
              <ChevronLeft
                className={cn(
                  "size-5 shrink-0 text-muted-foreground",
                  dir === "ltr" && "rotate-180",
                )}
              />
            </button>
          </m.li>
        ))}
      </ul>
    </div>
  );
}
