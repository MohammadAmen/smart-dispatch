"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { FadeIn } from "@/components/ui/fade-in";
import { GlassCard } from "@/components/ui/glass-card";
import { LocaleToggle } from "@/components/ui/locale-toggle";
import { PageHeader } from "@/components/ui/page-header";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { selectPendingCount, useSyncStore } from "@/stores/sync-store";

const settingIds = ["theme", "language", "offline", "bandwidth", "alerts"] as const;

export function SettingsPage(): ReactNode {
  const { t } = useLocale();
  const pending = useSyncStore(selectPendingCount);

  return (
    <div className="space-y-6">
      <FadeIn>
        <PageHeader
          title={t("settings.title")}
          description={t("settings.description")}
        />
      </FadeIn>
      <GlassCard hover={false} className="divide-y divide-border/70 p-0">
        <div className="flex items-center justify-between gap-4 px-5 py-4">
          <div>
            <p className="text-sm font-medium">{t("settings.users.label")}</p>
            <p className="text-xs text-muted-foreground">{t("settings.users.detail")}</p>
          </div>
          <Link href="/settings/users" className={buttonVariants({ size: "sm" })}>
            {t("users.manage")}
          </Link>
        </div>
        <div className="flex items-center justify-between gap-4 px-5 py-4">
          <div>
            <p className="text-sm font-medium">{t("settings.zones.label")}</p>
            <p className="text-xs text-muted-foreground">{t("settings.zones.detail")}</p>
          </div>
          <Link href="/settings/zones" className={buttonVariants({ size: "sm" })}>
            {t("users.manage")}
          </Link>
        </div>
        <div className="flex items-center justify-between gap-4 px-5 py-4">
          <div>
            <p className="text-sm font-medium">{t("settings.vehicleTypes.label")}</p>
            <p className="text-xs text-muted-foreground">{t("settings.vehicleTypes.detail")}</p>
          </div>
          <Link href="/settings/vehicle-types" className={buttonVariants({ size: "sm" })}>
            {t("users.manage")}
          </Link>
        </div>
        {settingIds.map((id) => (
          <div
            key={id}
            className="flex items-center justify-between gap-4 px-5 py-4"
          >
            <div>
              <p className="text-sm font-medium">{t(`settings.${id}.label`)}</p>
              <p className="text-xs text-muted-foreground">
                {t(`settings.${id}.detail`)}
              </p>
            </div>
            {id === "theme" ? (
              <ThemeToggle />
            ) : id === "language" ? (
              <LocaleToggle />
            ) : id === "offline" ? (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                {pending > 0
                  ? t("sync.pendingCount", { count: pending })
                  : t("common.ready")}
              </span>
            ) : (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                {t("common.ready")}
              </span>
            )}
          </div>
        ))}
      </GlassCard>
    </div>
  );
}
