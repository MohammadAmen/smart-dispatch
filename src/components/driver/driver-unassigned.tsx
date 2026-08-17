"use client";

import { Truck } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { logoutRequest } from "@/lib/auth/client";
import { useSessionStore } from "@/stores/session-store";

export function DriverUnassigned(): ReactNode {
  const { t, locale } = useLocale();
  const router = useRouter();

  const onLogout = async (): Promise<void> => {
    await logoutRequest();
    useSessionStore.getState().setUser(null);
    router.replace(`/${locale}/login`);
    router.refresh();
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <GlassCard hover={false} className="w-full max-w-md">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-warning/15 text-warning-foreground">
          <Truck className="size-6" />
        </span>
        <h1 className="mt-4 text-xl font-bold tracking-tight">{t("driver.noVehicleTitle")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("driver.noVehicleBody")}</p>
        <Button
          className="mt-5"
          variant="outline"
          onPress={() => {
            void onLogout();
          }}
        >
          {t("navbar.logout")}
        </Button>
      </GlassCard>
    </div>
  );
}
