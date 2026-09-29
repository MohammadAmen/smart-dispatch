import type { ReactNode } from "react";

import { BRAND_LOGO_SRC, BRAND_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

export type BeevLoaderVariant = "fullscreen" | "page" | "inline" | "overlay";

const DEFAULT_LABEL_AR = "جاري التحميل...";

export function BeevLoader({
  variant = "page",
  label = DEFAULT_LABEL_AR,
  className,
}: {
  variant?: BeevLoaderVariant;
  /** Override the generic loading copy when needed (keep it action-agnostic). */
  label?: string;
  className?: string;
}): ReactNode {
  const compact = variant === "inline";

  const content = (
    <div
      className={cn(
        "beev-loader relative z-10 flex flex-col items-center justify-center text-center",
        compact ? "gap-3" : "gap-5",
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
    >
      <div className={cn("relative", compact ? "size-[4.5rem]" : "size-[6.25rem] sm:size-[7rem]")}>
        <span
          className={cn(
            "pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(245,186,66,0.35)_0%,transparent_68%)]",
            !compact && "scale-125",
          )}
          aria-hidden
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={BRAND_LOGO_SRC}
          alt={BRAND_NAME}
          width={compact ? 72 : 112}
          height={compact ? 72 : 112}
          decoding="async"
          draggable={false}
          className={cn(
            "beev-loader-float relative z-[1] mx-auto bg-transparent object-contain drop-shadow-[0_12px_28px_rgba(180,120,40,0.28)]",
            compact ? "size-[4.5rem]" : "size-[6.25rem] sm:size-[7rem]",
          )}
        />
      </div>

      <span
        className={cn(
          "beev-loader-ring block rounded-full border-[2.5px] border-amber-400/25 border-t-amber-500",
          compact ? "size-7" : "size-9",
        )}
        aria-hidden
      />

      {label ? (
        <p
          className={cn(
            "font-medium tracking-wide text-slate-600",
            compact ? "text-xs" : "text-sm sm:text-[0.9375rem]",
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

  if (variant === "overlay") {
    return (
      <div className={cn("beev-loader-enter fixed inset-0 z-[90]", className)}>
        <div className="absolute inset-0 bg-[#FFFDF9]/88 backdrop-blur-[2px]" aria-hidden />
        <div className="relative flex size-full items-center justify-center">
          {content}
        </div>
      </div>
    );
  }

  if (variant === "fullscreen") {
    return (
      <div className={cn("beev-loader-enter fixed inset-0 z-[90]", className)}>
        <BeevLoaderSurface className="absolute inset-0">{content}</BeevLoaderSurface>
      </div>
    );
  }

  // page — fills the current layout slot (route `loading.tsx`, Suspense fallbacks)
  return (
    <div
      className={cn(
        "beev-loader-enter relative min-h-[min(70dvh,36rem)] w-full overflow-hidden",
        className,
      )}
    >
      <BeevLoaderSurface className="absolute inset-0 min-h-[min(70dvh,36rem)]">
        {content}
      </BeevLoaderSurface>
    </div>
  );
}

function BeevLoaderSurface({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}): ReactNode {
  return (
    <div
      className={cn(
        "relative flex size-full min-h-[inherit] items-center justify-center overflow-hidden bg-[#FFFDF9]",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_32%,rgba(245,198,90,0.22),transparent_58%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_85%_90%,rgba(196,140,72,0.08),transparent_48%)]"
        aria-hidden
      />
      <div className="beev-loader-honeycomb pointer-events-none absolute inset-0 opacity-[0.07]" aria-hidden />
      {children}
    </div>
  );
}
