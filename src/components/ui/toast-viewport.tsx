"use client";

import { AnimatePresence, m } from "framer-motion";
import {
  CheckCircle2,
  CloudOff,
  CloudUpload,
  PackagePlus,
  Volume2,
  VolumeX,
  WifiOff,
  X,
} from "lucide-react";
import type { ReactNode } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import type { ToastKind } from "@/stores/toast-store";
import { useToastStore } from "@/stores/toast-store";
import { cn } from "@/lib/utils";

const toneClass: Record<ToastKind, string> = {
  queued: "text-warning-foreground dark:text-warning",
  syncing: "text-info",
  synced: "text-success",
  offline: "text-muted-foreground",
  error: "text-destructive",
  incoming: "text-info",
  audio: "text-primary",
};

const iconByKind: Record<ToastKind, typeof CloudOff> = {
  queued: CloudOff,
  syncing: CloudUpload,
  synced: CheckCircle2,
  offline: WifiOff,
  error: CloudOff,
  incoming: PackagePlus,
  audio: Volume2,
};

export function ToastViewport(): ReactNode {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);
  const { t } = useLocale();

  return (
    <div className="pointer-events-none fixed top-20 end-4 z-[1100] flex w-[min(100%-2rem,22rem)] flex-col gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const Icon =
            toast.kind === "audio" && toast.muted ? VolumeX : iconByKind[toast.kind];
          const title =
            toast.kind === "audio"
              ? t(toast.muted ? "audio.muted" : "audio.unmuted")
              : t(`sync.toast.${toast.kind}`, {
                  count: toast.count ?? 0,
                  entityId: toast.entityId ?? "",
                });
          const detail =
            toast.kind === "queued" && toast.entityId
              ? t("sync.toast.queuedDetail", { entityId: toast.entityId })
              : toast.kind === "incoming" && toast.entityId
                ? t("sync.toast.incomingDetail", { entityId: toast.entityId })
                : toast.kind === "audio"
                  ? t(toast.muted ? "audio.mutedDetail" : "audio.unmutedDetail")
                  : undefined;

          return (
            <m.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: -12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="glass pointer-events-auto flex gap-3 rounded-2xl p-3.5 shadow-[0_18px_40px_-24px_oklch(0.2_0.05_250/0.45)]"
              role="status"
            >
              <Icon className={cn("mt-0.5 size-4 shrink-0", toneClass[toast.kind])} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{title}</p>
                {detail ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
                ) : null}
              </div>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={t("sync.dismiss")}
                onPress={() => dismiss(toast.id)}
              >
                <X />
              </Button>
            </m.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
