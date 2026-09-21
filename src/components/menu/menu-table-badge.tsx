"use client";

import { UtensilsCrossed } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function MenuTableBadge({
  tableLabel,
  sessionCode,
  tableText,
  sessionText,
  className,
}: {
  tableLabel: string;
  sessionCode?: string;
  tableText: string;
  sessionText?: string;
  className?: string;
}): ReactNode {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/18",
        "bg-background/40 px-3 py-1.5 text-[11px] font-semibold tracking-wide backdrop-blur-xl",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]",
        className,
      )}
    >
      <UtensilsCrossed className="size-3.5 shrink-0 text-primary" />
      <span className="truncate">{tableText || tableLabel}</span>
      {sessionCode && sessionText ? (
        <>
          <span className="text-muted-foreground/70">·</span>
          <span className="shrink-0 tabular-nums text-primary">{sessionText}</span>
        </>
      ) : null}
    </span>
  );
}
