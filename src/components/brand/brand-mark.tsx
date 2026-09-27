"use client";

import type { ReactNode } from "react";

import { BRAND_LOGO_SRC, BRAND_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

export function BrandMark({
  className,
  size = 36,
  rounded = true,
}: {
  className?: string;
  size?: number;
  rounded?: boolean;
}): ReactNode {
  return (
    // Brand lockup lives in /public; keep a plain img for offline-first shells.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={BRAND_LOGO_SRC}
      alt={BRAND_NAME}
      width={size}
      height={size}
      decoding="async"
      className={cn(
        "shrink-0 object-contain bg-black",
        rounded && "rounded-xl",
        className,
      )}
    />
  );
}
