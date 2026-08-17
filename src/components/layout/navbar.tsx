"use client";

import { AnimatePresence, m } from "framer-motion";
import { Bell, CloudUpload, LogOut, Menu, Search, Wifi, WifiOff } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { AudioToggle } from "@/components/ui/audio-toggle";
import { LocaleToggle } from "@/components/ui/locale-toggle";
import { PulseDot } from "@/components/ui/pulse-dot";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { logoutRequest } from "@/lib/auth/client";
import { cn } from "@/lib/utils";
import { useOpsStore, type ConnectionStatus } from "@/stores/ops-store";
import { useSessionStore } from "@/stores/session-store";
import { selectPendingCount, useSyncStore } from "@/stores/sync-store";
import { useUiStore } from "@/stores/ui-store";

function ConnectionChip(): ReactNode {
  const status = useOpsStore((state) => state.connectionStatus);
  const { t } = useLocale();
  const tone: Record<ConnectionStatus, "success" | "warning" | "destructive"> = {
    online: "success",
    degraded: "warning",
    offline: "destructive",
  };
  const Icon = status === "offline" ? WifiOff : Wifi;

  return (
    <div
      className="glass flex items-center gap-2 rounded-full px-2.5 py-1.5"
      role="status"
      aria-live="polite"
    >
      <PulseDot tone={tone[status]} />
      <Icon className="size-3.5 text-muted-foreground" />
      <span className="hidden text-xs font-medium sm:inline">
        {t(`connection.${status}`)}
      </span>
    </div>
  );
}

function PendingSyncChip(): ReactNode {
  const count = useSyncStore(selectPendingCount);
  const isSyncing = useSyncStore((state) => state.isSyncing);
  const { t } = useLocale();

  return (
    <AnimatePresence initial={false}>
      {count > 0 ? (
        <m.div
          key="pending-sync"
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.92 }}
          className="glass flex items-center gap-2 rounded-full px-2.5 py-1.5"
          role="status"
          aria-live="polite"
        >
          <CloudUpload
            className={cn(
              "size-3.5 text-warning-foreground dark:text-warning",
              isSyncing && "animate-pulse",
            )}
          />
          <span className="hidden text-xs font-medium sm:inline">
            {t("sync.pending")}
          </span>
          <span className="font-mono text-sm font-semibold tabular-nums">
            {count}
          </span>
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}

function ActiveOrdersChip(): ReactNode {
  const count = useOpsStore((state) => state.activeOrders);
  const { t } = useLocale();

  return (
    <div
      className="glass flex items-center gap-2 rounded-full px-2.5 py-1.5"
      aria-label={`${count} ${t("navbar.activeOrders")}`}
    >
      <span className="relative flex size-5 items-center justify-center">
        <span className="pulse-ring absolute size-5 rounded-full bg-primary/35" />
        <span className="relative size-2 rounded-full bg-primary" />
      </span>
      <span className="hidden text-xs text-muted-foreground sm:inline">
        {t("navbar.activeOrders")}
      </span>
      <m.span
        key={count}
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="font-mono text-sm font-semibold tabular-nums"
      >
        {count}
      </m.span>
    </div>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "S";
  const second = parts[1]?.[0] ?? parts[0]?.[1] ?? "";
  return `${first}${second}`.toUpperCase();
}

export function Navbar(): ReactNode {
  const setMobileNavOpen = useUiStore((state) => state.setMobileNavOpen);
  const { t, locale } = useLocale();
  const router = useRouter();
  const user = useSessionStore((state) => state.user);

  const onLogout = async (): Promise<void> => {
    await logoutRequest();
    useSessionStore.getState().setUser(null);
    router.replace(`/${locale}/login`);
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/45 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 px-4 md:px-6">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label={t("aria.openNav")}
          onPress={() => setMobileNavOpen(true)}
        >
          <Menu />
        </Button>

        <label
          className={cn(
            "glass group hidden min-w-0 flex-1 items-center gap-2 rounded-full px-3 py-2 sm:flex",
            "max-w-md",
          )}
        >
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            type="search"
            placeholder={t("navbar.searchPlaceholder")}
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden rounded-md border border-border bg-background/70 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground lg:inline">
            /
          </kbd>
        </label>

        <div className="ms-auto flex items-center gap-2">
          <ConnectionChip />
          <PendingSyncChip />
          <ActiveOrdersChip />
          <LocaleToggle className="hidden sm:inline-flex" />
          <AudioToggle />
          <ThemeToggle />
          <Button variant="ghost" size="icon" aria-label={t("aria.notifications")}>
            <span className="relative">
              <Bell className="size-4" />
              <span className="absolute -top-0.5 -end-0.5 size-1.5 rounded-full bg-primary" />
            </span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("navbar.logout")}
            onPress={() => {
              void onLogout();
            }}
          >
            <LogOut className="size-4" />
          </Button>
          <div className="hidden items-center gap-2 ps-1 sm:flex">
            <span className="flex size-8 items-center justify-center rounded-full bg-linear-to-br from-primary to-info text-xs font-semibold text-primary-foreground">
              {user ? initials(user.name) : "SD"}
            </span>
            <div className="hidden leading-tight lg:block">
              <p className="text-xs font-medium">{user?.name ?? t("navbar.userName")}</p>
              <p className="text-[11px] text-muted-foreground">
                {user ? t(`status.role.${user.role}`) : t("navbar.dispatcher")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
