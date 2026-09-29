"use client";

import { m } from "framer-motion";
import Image from "next/image";
import { LayoutGrid } from "lucide-react";
import type { ReactNode } from "react";

import { BRAND_LOGO_SRC } from "@/lib/brand";
import { cn } from "@/lib/utils";

export function CategoryGridCard({
  label,
  imageUrl,
  icon,
  active,
  onSelect,
  variant = "default",
}: {
  label: string;
  imageUrl?: string | null;
  icon?: ReactNode;
  active: boolean;
  onSelect: () => void;
  variant?: "default" | "beev-all" | "burn";
}): ReactNode {
  return (
    <m.button
      type="button"
      whileTap={{ scale: 0.97 }}
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        "relative h-[6.75rem] w-[5.65rem] shrink-0 cursor-pointer overflow-hidden rounded-3xl border shadow-md transition-all sm:h-28 sm:w-36",
        active
          ? "scale-[1.02] border-amber-400 ring-2 ring-amber-500 shadow-lg shadow-amber-500/20"
          : "border-slate-100/90 dark:border-slate-800",
        variant === "burn" &&
          !active &&
          "border-rose-300/50 bg-linear-to-br from-rose-500/15 via-orange-500/10 to-amber-400/15",
        variant === "burn" &&
          active &&
          "border-transparent bg-linear-to-br from-rose-600 via-orange-500 to-amber-400 ring-rose-400/50",
      )}
    >
      {variant === "beev-all" ? (
        <span className="absolute inset-0 bg-linear-to-b from-amber-300 via-amber-500 to-amber-700">
          <span className="absolute inset-x-0 top-1 bottom-9 flex flex-col items-center justify-center gap-0.5 px-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={BRAND_LOGO_SRC}
              alt=""
              width={80}
              height={80}
              className="h-[3.25rem] w-[3.25rem] object-contain drop-shadow-md sm:h-[4.25rem] sm:w-[4.25rem]"
              draggable={false}
            />
            <span className="font-heading text-[10px] font-extrabold tracking-wide text-slate-900 sm:text-xs">
              BEEV
            </span>
          </span>
        </span>
      ) : variant === "burn" ? (
        <span className="absolute inset-0 flex items-center justify-center bg-linear-to-br from-rose-600/90 via-orange-500/85 to-amber-400/80">
          {icon}
        </span>
      ) : imageUrl ? (
        <Image src={imageUrl} alt="" fill sizes="144px" className="object-cover" unoptimized />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center bg-linear-to-br from-slate-700 to-slate-900">
          {icon ?? <LayoutGrid className="size-8 text-white/80" />}
        </span>
      )}

      {variant !== "burn" ? (
        <span className="absolute inset-0 flex items-end justify-center bg-linear-to-t from-black/85 via-black/35 to-transparent px-2 pb-2 pt-6">
          <span className="line-clamp-2 text-center text-[11px] font-bold leading-tight text-white drop-shadow-md sm:text-sm">
            {label}
          </span>
        </span>
      ) : (
        <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent px-2 pb-2 pt-4 text-center text-[11px] font-bold text-white sm:text-sm">
          {label}
        </span>
      )}
    </m.button>
  );
}
