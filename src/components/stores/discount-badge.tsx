"use client";

import { m } from "framer-motion";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function DiscountBadge({
  label,
  className,
  pulse = false,
  variant = "ribbon",
}: {
  label: string;
  className?: string;
  pulse?: boolean;
  variant?: "ribbon" | "compact";
}): ReactNode {
  const compact = variant === "compact";

  return (
    <m.span
      className={cn(
        "inline-flex items-center justify-center border border-white/25 font-extrabold tracking-wide text-white",
        "bg-linear-to-br from-rose-600 to-orange-500",
        compact
          ? "rounded-md px-1.5 py-0.5 text-[10px] shadow-sm"
          : "-rotate-6 rounded-[7px] px-2 py-1 text-[11px] shadow-[0_8px_18px_-6px_rgb(244_63_94/0.7)]",
        className,
      )}
      animate={
        pulse
          ? {
              boxShadow: [
                "0 8px 16px -6px rgb(244 63 94 / 0.45), 0 0 0 0 rgb(251 146 60 / 0)",
                "0 8px 18px -4px rgb(244 63 94 / 0.7), 0 0 16px 2px rgb(251 146 60 / 0.28)",
                "0 8px 16px -6px rgb(244 63 94 / 0.45), 0 0 0 0 rgb(251 146 60 / 0)",
              ],
            }
          : undefined
      }
      transition={pulse ? { duration: 2.2, repeat: Infinity, ease: "easeInOut" } : undefined}
    >
      {label}
    </m.span>
  );
}
