"use client";

import { LazyMotion, MotionConfig, domMax } from "framer-motion";
import type { ReactNode } from "react";

import { OfflineSync } from "@/components/offline/offline-sync";
import { AudioUnlock } from "@/components/providers/audio-unlock";
import { ToastViewport } from "@/components/ui/toast-viewport";

export function DriverShell({ children }: { children: ReactNode }): ReactNode {
  return (
    <LazyMotion features={domMax} strict>
      <MotionConfig reducedMotion="user">
        <AudioUnlock />
        <OfflineSync />
        <ToastViewport />
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}
