"use client";

import { m } from "framer-motion";
import { Radio, WifiOff } from "lucide-react";
import type { ReactNode } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import type { DriverDutyStatus } from "@/lib/driver/types";

interface DriverIdleProps {
  dutyStatus: DriverDutyStatus;
}

export function DriverIdle({ dutyStatus }: DriverIdleProps): ReactNode {
  const { t } = useLocale();
  const offline = dutyStatus === "OFFLINE";

  return (
    <m.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-strong flex flex-col items-center rounded-3xl px-6 py-12 text-center"
    >
      <span className="relative mb-4 flex size-16 items-center justify-center rounded-full bg-primary/15">
        {offline ? (
          <WifiOff className="size-8 text-muted-foreground" />
        ) : (
          <>
            <span className="pulse-ring absolute inset-0 rounded-full bg-success/40" />
            <Radio className="relative size-8 text-success" />
          </>
        )}
      </span>
      <h2 className="text-xl font-bold">
        {offline ? t("driver.offlineTitle") : t("driver.waitingTitle")}
      </h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        {offline ? t("driver.offlineBody") : t("driver.waitingBody")}
      </p>
    </m.section>
  );
}
