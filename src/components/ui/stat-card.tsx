"use client";

import { m } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  delta: string;
  trend: "up" | "down";
  hint: string;
  icon: LucideIcon;
  delay?: number;
}

export function StatCard({
  label,
  value,
  delta,
  trend,
  hint,
  icon: Icon,
  delay = 0,
}: StatCardProps): ReactNode {
  return (
    <m.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3, scale: 1.01 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
      className="glass group relative overflow-hidden rounded-2xl p-5"
    >
      <div className="pointer-events-none absolute -right-8 -top-8 size-28 rounded-full bg-primary/10 blur-2xl transition-opacity group-hover:opacity-100" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {label}
          </p>
          <p className="mt-2 font-heading text-3xl font-semibold tracking-tight">
            {value}
          </p>
        </div>
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
          <Icon className="size-5" />
        </span>
      </div>
      <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 font-medium",
            trend === "up"
              ? "bg-success/12 text-success"
              : "bg-warning/14 text-warning-foreground dark:text-warning",
          )}
        >
          {delta}
        </span>
        {hint}
      </p>
    </m.article>
  );
}
