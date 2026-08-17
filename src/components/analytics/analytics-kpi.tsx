"use client";

import type { LucideIcon } from "lucide-react";
import { m } from "framer-motion";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface AnalyticsKpiProps {
  label: string;
  value: string;
  detail: string;
  hint: string;
  icon: LucideIcon;
  delay?: number;
  tone?: "primary" | "success" | "warning" | "info";
}

const toneClass: Record<NonNullable<AnalyticsKpiProps["tone"]>, string> = {
  primary: "bg-primary/12 text-primary",
  success: "bg-success/12 text-success",
  warning: "bg-warning/14 text-warning-foreground dark:text-warning",
  info: "bg-info/12 text-info",
};

export function AnalyticsKpi({
  label,
  value,
  detail,
  hint,
  icon: Icon,
  delay = 0,
  tone = "primary",
}: AnalyticsKpiProps): ReactNode {
  return (
    <m.article
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      className="glass group relative overflow-hidden rounded-2xl p-5"
    >
      <div className="pointer-events-none absolute -end-10 -top-10 size-32 rounded-full bg-primary/10 blur-3xl transition-opacity group-hover:opacity-100" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            {label}
          </p>
          <p className="mt-2 font-heading text-3xl font-semibold tracking-tight">
            {value}
          </p>
        </div>
        <span
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl",
            toneClass[tone],
          )}
        >
          <Icon className="size-5" />
        </span>
      </div>
      <p className="mt-4 text-sm font-medium">{detail}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </m.article>
  );
}
