"use client";

import { BellRing, Languages, Truck } from "lucide-react";
import type { ReactNode } from "react";

import { DriverDutySwitch } from "@/components/driver/driver-duty-switch";
import { useLocale } from "@/components/providers/locale-provider";
import { AudioToggle } from "@/components/ui/audio-toggle";
import { Button } from "@/components/ui/button";
import { PulseDot } from "@/components/ui/pulse-dot";
import type { DriverDutyStatus } from "@/lib/driver/types";
import type { BrowserNotificationPermission } from "@/lib/notify";
import { cn } from "@/lib/utils";

interface DriverStatusBarProps {
  driverName: string;
  vehicleType: string;
  dutyStatus: DriverDutyStatus;
  online: boolean;
  onDutyChange: (status: DriverDutyStatus) => void;
  onSwitchDriver?: () => void;
  alertsPermission?: BrowserNotificationPermission;
  onEnableAlerts?: () => void;
}

export function DriverStatusBar({
  driverName,
  vehicleType,
  dutyStatus,
  online,
  onDutyChange,
  onSwitchDriver,
  alertsPermission = "unsupported",
  onEnableAlerts,
}: DriverStatusBarProps): ReactNode {
  const { t, locale, setLocale } = useLocale();
  const nextLocale = locale === "ar" ? "en" : "ar";
  const available = dutyStatus === "AVAILABLE";

  return (
    <header className="glass-strong sticky top-0 z-30 border-b px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            {t("driver.kicker")}
          </p>
          <div className="mt-0.5 flex items-center gap-2">
            <Truck className="size-4 shrink-0 text-primary" />
            <h1 className="truncate text-lg font-bold tracking-tight">
              {driverName || t("driver.title")}
            </h1>
          </div>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">
            {vehicleType || "—"}
          </p>
        </div>
        <DriverDutySwitch status={dutyStatus} onChange={onDutyChange} />
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <div
          className={cn(
            "flex items-center gap-2 rounded-full px-2.5 py-1.5 text-xs font-semibold",
            available
              ? "bg-success/15 text-success"
              : "bg-muted text-muted-foreground",
          )}
        >
          <PulseDot tone={available ? "success" : "muted"} />
          {available ? t("driver.onDuty") : t("driver.offDuty")}
        </div>
        <div className="flex items-center gap-1">
          <PulseDot tone={online ? "success" : "destructive"} />
          <span className="text-xs font-medium">
            {t(online ? "connection.online" : "connection.offline")}
          </span>
          <AudioToggle />
          {alertsPermission === "default" && onEnableAlerts ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-10 touch-manipulation px-2 text-xs"
              onPress={onEnableAlerts}
            >
              <BellRing className="size-4" />
              {t("driver.enableAlerts")}
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            className="ms-1 h-10 min-w-10 touch-manipulation px-2"
            aria-label={t("common.language")}
            onPress={() => setLocale(nextLocale)}
          >
            <Languages className="size-4" />
            <span className="text-xs font-semibold">
              {locale === "ar" ? t("common.english") : t("common.arabic")}
            </span>
          </Button>
          {onSwitchDriver ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-10 touch-manipulation px-2 text-xs"
              onPress={onSwitchDriver}
            >
              {t("driver.switchDriver")}
            </Button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
