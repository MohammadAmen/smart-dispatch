"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { Navbar } from "@/components/layout/navbar";
import { Sidebar } from "@/components/layout/sidebar";
import { AudioUnlock } from "@/components/providers/audio-unlock";
import { SessionSync } from "@/components/auth/session-sync";
import { MotionProvider } from "@/components/providers/motion-provider";
import { OfflineSync } from "@/components/offline/offline-sync";
import { OpsSync } from "@/components/providers/ops-sync";
import { ToastViewport } from "@/components/ui/toast-viewport";
import { isDispatchPath } from "@/lib/paths";
import { cn } from "@/lib/utils";

interface DashboardShellProps {
  children: ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps): ReactNode {
  const pathname = usePathname();
  const flush = isDispatchPath(pathname);

  return (
    <MotionProvider>
      <AudioUnlock />
      <SessionSync />
      <OpsSync />
      <OfflineSync />
      <ToastViewport />
      <div className={cn("ambient-mesh relative", flush ? "h-dvh overflow-hidden" : "min-h-dvh")}>
        <div className={cn("flex", flush ? "h-full" : "min-h-dvh")}>
          <Sidebar />
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <Navbar />
            <main
              className={cn(
                "min-h-0 flex-1",
                flush
                  ? "flex flex-col overflow-hidden"
                  : "px-4 py-5 md:px-6 md:py-6",
              )}
            >
              {children}
            </main>
          </div>
        </div>
      </div>
    </MotionProvider>
  );
}
