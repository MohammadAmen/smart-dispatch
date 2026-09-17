"use client";

import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { GlassCard } from "@/components/ui/glass-card";
import { cn } from "@/lib/utils";

export function formatGrowth(value: number): string {
  const abs = Math.abs(value).toFixed(1);
  if (value > 0.05) {
    return `+${abs}%`;
  }
  if (value < -0.05) {
    return `-${abs}%`;
  }
  return "0.0%";
}

export function GrowthBadge({
  value,
  hint,
}: {
  value: number;
  hint: string;
}): ReactNode {
  const up = value > 0.05;
  const down = value < -0.05;
  const Icon = up ? TrendingUp : down ? TrendingDown : Minus;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
          up && "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
          down && "bg-rose-500/12 text-rose-700 dark:text-rose-300",
          !up && !down && "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="size-3.5" />
        {formatGrowth(value)}
      </span>
      <span className="text-[11px] text-muted-foreground">{hint}</span>
    </div>
  );
}

export function VendorKpiCard({
  label,
  value,
  icon: Icon,
  growth,
  growthHint,
  footer,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  growth?: number;
  growthHint?: string;
  footer?: ReactNode;
}): ReactNode {
  return (
    <GlassCard className="space-y-3">
      <span className="flex size-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
        <Icon className="size-5" />
      </span>
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="font-heading text-2xl font-semibold tracking-tight">{value}</p>
      {growth !== undefined && growthHint ? <GrowthBadge value={growth} hint={growthHint} /> : null}
      {footer}
    </GlassCard>
  );
}
