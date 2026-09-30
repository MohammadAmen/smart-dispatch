"use client";

import type { ReactNode } from "react";

import { BRAND_LOGO_SRC, BRAND_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

export type BeevLoaderVariant = "fullscreen" | "page" | "inline" | "overlay";

const DEFAULT_LABEL_AR = "جاري التحميل...";

/**
 * Lightweight brand loader — CSS animations only (no Framer, no network).
 * Full-bleed cream + honeycomb so the surface never cuts off mid-screen.
 */
export function BeevLoader({
  variant = "page",
  label = DEFAULT_LABEL_AR,
  className,
}: {
  variant?: BeevLoaderVariant;
  label?: string;
  className?: string;
}): ReactNode {
  const compact = variant === "inline";

  const content = (
    <div
      className={cn(
        "beev-loader relative z-10 mx-auto flex w-full max-w-sm flex-col items-center justify-center px-6 text-center",
        compact ? "gap-3" : "gap-5",
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
    >
      <div className={cn("relative flex items-center justify-center", compact ? "size-[4.75rem]" : "size-[7rem] sm:size-[7.75rem]")}>
        <span
          className={cn(
            "pointer-events-none absolute inset-[-18%] rounded-full",
            "bg-[radial-gradient(circle,rgba(245,186,66,0.42)_0%,rgba(245,186,66,0.08)_46%,transparent_70%)]",
          )}
          aria-hidden
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={BRAND_LOGO_SRC}
          alt={BRAND_NAME}
          width={compact ? 76 : 124}
          height={compact ? 76 : 124}
          decoding="async"
          draggable={false}
          className={cn(
            "beev-loader-float relative z-[1] bg-transparent object-contain drop-shadow-[0_14px_30px_rgba(180,120,40,0.3)]",
            compact ? "size-[4.75rem]" : "size-[7rem] sm:size-[7.75rem]",
          )}
        />
      </div>

      <span
        className={cn(
          "beev-loader-ring block rounded-full border-[2.5px] border-amber-400/30 border-t-amber-500",
          compact ? "size-7" : "size-9",
        )}
        aria-hidden
      />

      {label ? (
        <p
          className={cn(
            "font-medium tracking-wide text-slate-600",
            compact ? "text-xs" : "text-sm sm:text-[0.95rem]",
          )}
        >
          {label}
        </p>
      ) : null}
    </div>
  );

  if (variant === "inline") {
    return <div className={cn("flex items-center justify-center py-6", className)}>{content}</div>;
  }

  // page / overlay / fullscreen — always full viewport so honeycomb never clips
  return (
    <div
      className={cn(
        "beev-loader-enter fixed inset-0 z-[80] flex items-center justify-center",
        variant === "overlay" && "z-[90]",
        className,
      )}
    >
      <BeevLoaderSurface className="absolute inset-0 size-full" />
      <div className="relative z-10 flex size-full items-center justify-center pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
        {content}
      </div>
    </div>
  );
}

function BeevLoaderSurface({ className }: { className?: string }): ReactNode {
  return (
    <div className={cn("overflow-hidden bg-[#FFFDF9]", className)} aria-hidden>
      <div className="beev-loader-honeycomb absolute inset-0 opacity-[0.09]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_38%,rgba(245,198,90,0.26),transparent_62%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_100%,rgba(196,140,72,0.1),transparent_45%)]" />
    </div>
  );
}
