"use client";

import { m } from "framer-motion";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export function GlassCard({
  children,
  className,
  hover = true,
}: GlassCardProps): ReactNode {
  return (
    <m.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={hover ? { y: -2 } : undefined}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "glass rounded-2xl p-5",
        hover && "transition-shadow duration-300 hover:shadow-[0_18px_50px_-28px_oklch(0.45_0.08_195/0.45)]",
        className,
      )}
    >
      {children}
    </m.section>
  );
}
