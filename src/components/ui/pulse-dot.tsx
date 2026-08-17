import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface PulseDotProps {
  className?: string;
  tone?: "success" | "warning" | "destructive" | "muted";
}

const toneClass: Record<NonNullable<PulseDotProps["tone"]>, string> = {
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  muted: "bg-muted-foreground",
};

export function PulseDot({
  className,
  tone = "success",
}: PulseDotProps): ReactNode {
  return (
    <span className={cn("relative inline-flex size-2.5", className)}>
      <span
        className={cn(
          "pulse-ring absolute inset-0 rounded-full opacity-60",
          toneClass[tone],
        )}
      />
      <span
        className={cn(
          "pulse-dot relative inline-flex size-2.5 rounded-full",
          toneClass[tone],
        )}
      />
    </span>
  );
}
