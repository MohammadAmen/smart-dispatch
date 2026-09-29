"use client";

import type { ReactNode } from "react";

import { BRAND_LOGO_SRC } from "@/lib/brand";
import { cn } from "@/lib/utils";

export function StoryBrandMark({ className }: { className?: string }): ReactNode {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={BRAND_LOGO_SRC}
      alt=""
      className={cn("object-contain", className)}
      draggable={false}
    />
  );
}
