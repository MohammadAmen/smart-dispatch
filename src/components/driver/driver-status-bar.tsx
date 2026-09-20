"use client";

import { BellRing, LogOut, Truck, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { DriverDutySwitch } from "@/components/driver/driver-duty-switch";
import { useLocale } from "@/components/providers/locale-provider";
import { AudioToggle } from "@/components/ui/audio-toggle";
import { Button } from "@/components/ui/button";
import { PulseDot } from "@/components/ui/pulse-dot";
import { logoutRequest } from "@/lib/auth/client";
import type { DriverDutyStatus } from "@/lib/driver/types";
import type { BrowserNotificationPermission } from "@/lib/notify";
import { formatMoney, PRICE_CURRENCY } from "@/lib/stores/pricing";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/stores/session-store";

interface DriverStatusBarProps {
  driverName: string;
  vehicleType: string;
  dutyStatus: DriverDutyStatus;
  online: boolean;
  onDutyChange: (status: DriverDutyStatus) => void;
  onSwitchDriver?: () => void;
  alertsPermission?: BrowserNotificationPermission;
  onEnableAlerts?: () => void;
  dailyEarnings?: number;
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
  dailyEarnings = 0,
}: DriverStatusBarProps): ReactNode {
  const { t, locale } = useLocale();
  const router = useRouter();
  const available = dutyStatus === "AVAILABLE";

  const onLogout = async (): Promise<void> => {
    await logoutRequest();
    useSessionStore.getState().setUser(null);
    router.replace(`/${locale}/login`);
    router.refresh();
  };

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

      <div className="mt-3 flex items-center justify-between gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
        <span className="flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-200">
          <Wallet className="size-4" />
          {t("driver.dailyEarnings")}
        </span>
        <span className="font-heading text-base font-bold text-emerald-800 dark:text-emerald-100">
          {formatMoney(dailyEarnings)} {PRICE_CURRENCY}
        </span>
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
          <Button
            variant="ghost"
            size="sm"
            className="h-10 touch-manipulation px-2 text-xs"
            aria-label={t("navbar.logout")}
            onPress={() => {
              void onLogout();
            }}
          >
            <LogOut className="size-4" />
            {t("navbar.logout")}
          </Button>
        </div>
      </div>
    </header>
  );
}
