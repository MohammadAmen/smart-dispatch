import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type BadgeTone = "success" | "warning" | "info" | "muted" | "destructive";

interface StatusBadgeProps {
  label: string;
  tone?: BadgeTone;
  className?: string;
}

const toneClass: Record<BadgeTone, string> = {
  success:
    "bg-success/12 text-success ring-success/20",
  warning:
    "bg-warning/14 text-warning-foreground dark:text-warning ring-warning/25",
  info: "bg-info/12 text-info ring-info/20",
  muted: "bg-muted text-muted-foreground ring-border",
  destructive:
    "bg-destructive/12 text-destructive ring-destructive/20",
};

export function StatusBadge({
  label,
  tone = "muted",
  className,
}: StatusBadgeProps): ReactNode {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium tracking-wide uppercase ring-1",
        toneClass[tone],
        className,
      )}
    >
      {label}
    </span>
  );
}
