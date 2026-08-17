"use client";

import { AnimatePresence, m } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";
import { useCallback, type ReactNode } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { playNewOrderSound, unlockAudio } from "@/lib/audio";
import { cn } from "@/lib/utils";
import { useToastStore } from "@/stores/toast-store";
import { useUiStore } from "@/stores/ui-store";

export function AudioToggle({ className }: { className?: string }): ReactNode {
  const { t } = useLocale();
  const muted = useUiStore((state) => state.audioMuted);
  const setMuted = useUiStore((state) => state.setAudioMuted);

  const onToggle = useCallback(() => {
    const next = !useUiStore.getState().audioMuted;
    setMuted(next);

    if (next) {
      useToastStore.getState().push({ kind: "audio", muted: true });
      return;
    }

    void unlockAudio().then(() => {
      playNewOrderSound();
    });
    useToastStore.getState().push({ kind: "audio", muted: false });
  }, [setMuted]);

  return (
    <Button
      variant="ghost"
      size="icon"
      onPress={onToggle}
      aria-label={muted ? t("audio.unmute") : t("audio.mute")}
      aria-pressed={!muted}
      className={cn("relative overflow-hidden", className)}
    >
      <AnimatePresence mode="wait" initial={false}>
        <m.span
          key={muted ? "muted" : "live"}
          initial={{ opacity: 0, scale: 0.7, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.7, y: -8 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="flex"
        >
          {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        </m.span>
      </AnimatePresence>
    </Button>
  );
}
