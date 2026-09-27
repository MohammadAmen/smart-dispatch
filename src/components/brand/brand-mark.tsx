"use client";

import type { ReactNode } from "react";

import { BRAND_LOGO_SRC, BRAND_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

export function BrandMark({
  className,
  size = 48,
  rounded = true,
}: {
  className?: string;
  size?: number;
  rounded?: boolean;
}): ReactNode {
  return (
    // Brand lockup lives in /public as PNG with alpha; keep a plain img so
    // offline shells and Next image optimization never strip transparency.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={BRAND_LOGO_SRC}
      alt={BRAND_NAME}
      width={size}
      height={size}
      decoding="async"
      className={cn(
        "h-12 w-12 shrink-0 bg-transparent object-contain shadow-sm",
        rounded && "rounded-xl border border-slate-100 dark:border-slate-800",
        className,
      )}
      style={{ width: size, height: size }}
    />
  );
}
