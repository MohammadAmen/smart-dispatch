"use client";

import type { ReactNode } from "react";

import { AudioUnlock } from "@/components/providers/audio-unlock";
import { OfflineSync } from "@/components/offline/offline-sync";
import { MotionProvider } from "@/components/providers/motion-provider";
import { ToastViewport } from "@/components/ui/toast-viewport";

export function DriverShell({ children }: { children: ReactNode }): ReactNode {
  return (
    <MotionProvider>
      <AudioUnlock />
      <OfflineSync />
      <ToastViewport />
      {children}
    </MotionProvider>
  );
}
