"use client";

import {
  LoaderCircle,
  Maximize2,
  Minimize2,
  PanelRightClose,
  PanelRightOpen,
  Zap,
} from "lucide-react";
import type { ReactNode } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { PulseDot } from "@/components/ui/pulse-dot";
import { cn } from "@/lib/utils";
import {
  selectPendingAssignCount,
  useDispatchStore,
} from "@/stores/dispatch-store";
import { useOpsStore, type ConnectionStatus } from "@/stores/ops-store";
import { selectPendingCount, useSyncStore } from "@/stores/sync-store";
import { useUiStore } from "@/stores/ui-store";

const connectionTone: Record<
  ConnectionStatus,
  "success" | "warning" | "destructive"
> = {
  online: "success",
  degraded: "warning",
  offline: "destructive",
};

export function DispatchHeader(): ReactNode {
  const { t } = useLocale();
  const connectionStatus = useOpsStore((state) => state.connectionStatus);
  const pendingSync = useSyncStore(selectPendingCount);
  const pendingAssign = useDispatchStore(selectPendingAssignCount);
  const isAutoDispatching = useDispatchStore((state) => state.isAutoDispatching);
  const autoDispatch = useDispatchStore((state) => state.autoDispatch);
  const queueCollapsed = useDispatchStore((state) => state.queueCollapsed);
  const toggleQueue = useDispatchStore((state) => state.toggleQueue);
  const sidebarCollapsed = useUiStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);

  return (
    <header className="glass-strong z-20 flex shrink-0 flex-wrap items-center gap-3 border-b px-4 py-3 md:px-5">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
          {t("dispatch.kicker")}
        </p>
        <h1 className="font-heading truncate text-lg font-semibold tracking-tight md:text-xl">
          {t("dispatch.title")}
        </h1>
      </div>

      <div
        className="glass flex items-center gap-2 rounded-full px-2.5 py-1.5"
        role="status"
        aria-live="polite"
      >
        <PulseDot tone={connectionTone[connectionStatus]} />
        <span className="text-xs font-medium">
          {t(`connection.${connectionStatus}`)}
        </span>
        {pendingSync > 0 ? (
          <span className="font-mono text-[11px] text-muted-foreground">
            · {t("sync.pendingCount", { count: pendingSync })}
          </span>
        ) : null}
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="hidden md:inline-flex"
        aria-label={
          sidebarCollapsed ? t("aria.expandSidebar") : t("dispatch.expandMap")
        }
        onPress={toggleSidebar}
      >
        {sidebarCollapsed ? (
          <Minimize2 className="rtl:-scale-x-100" />
        ) : (
          <Maximize2 className="rtl:-scale-x-100" />
        )}
      </Button>

      <Button
        variant="ghost"
        size="icon"
        aria-label={
          queueCollapsed
            ? t("dispatch.expandQueue")
            : t("dispatch.collapseQueue")
        }
        onPress={toggleQueue}
      >
        {queueCollapsed ? (
          <PanelRightOpen className="rtl:-scale-x-100" />
        ) : (
          <PanelRightClose className="rtl:-scale-x-100" />
        )}
      </Button>

      <Button
        onPress={() => {
          void autoDispatch();
        }}
        isDisabled={isAutoDispatching || pendingAssign === 0}
        className={cn(
          "relative overflow-hidden",
          pendingAssign > 0 && !isAutoDispatching && "shadow-[0_10px_28px_-14px_oklch(0.55_0.14_195)]",
        )}
      >
        {isAutoDispatching ? (
          <>
            <span className="pulse-ring absolute inset-0 rounded-lg bg-primary/30" />
            <LoaderCircle data-icon="inline-start" className="animate-spin" />
            {t("dispatch.autoDispatching")}
          </>
        ) : (
          <>
            <Zap data-icon="inline-start" />
            {t("dispatch.autoDispatch")}
          </>
        )}
      </Button>
    </header>
  );
}
