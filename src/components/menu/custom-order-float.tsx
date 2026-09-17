"use client";

import { AnimatePresence, m } from "framer-motion";
import { Palette } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";

export function CustomOrderFloat({
  visible,
  lifted,
  hidden,
  onPress,
}: {
  visible: boolean;
  lifted: boolean;
  hidden: boolean;
  onPress: () => void;
}): ReactNode {
  const { t } = useLocale();
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    if (!visible || hidden) {
      setCompact(false);
      return;
    }

    let lastY = window.scrollY;
    const onScroll = (): void => {
      const y = window.scrollY;
      setCompact(y > 96 && y > lastY);
      lastY = y;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [hidden, visible]);

  return (
    <AnimatePresence>
      {visible && !hidden ? (
        <m.div
          initial={{ opacity: 0, y: 16, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.96 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            "pointer-events-none fixed inset-x-0 z-[45] mx-auto w-full max-w-lg px-3",
            lifted
              ? "bottom-[calc(6rem+env(safe-area-inset-bottom))]"
              : "bottom-[max(1rem,env(safe-area-inset-bottom))]",
          )}
        >
          <div className="flex justify-start">
            <button
              type="button"
              onClick={onPress}
              aria-label={t("menu.customFloat")}
              className={cn(
                "custom-order-glow pointer-events-auto inline-flex items-center rounded-full text-start text-white",
                "bg-linear-to-r from-teal-500 via-emerald-500 to-cyan-500",
                "shadow-lg shadow-teal-500/30 ring-2 ring-white/25",
                compact ? "gap-0 p-2.5" : "max-w-[min(100%,17.75rem)] gap-2 px-3 py-2",
              )}
            >
              <span className="relative flex size-8 shrink-0 items-center justify-center rounded-full bg-white/20">
                <Palette className="size-4 animate-pulse motion-reduce:animate-none" />
              </span>
              <span
                className={cn(
                  "min-w-0 overflow-hidden text-[12px] leading-tight font-semibold whitespace-nowrap transition-[max-width,opacity,padding] duration-200",
                  compact ? "max-w-0 pe-0 opacity-0" : "max-w-56 pe-1 opacity-100",
                )}
              >
                {t("menu.customFloat")}
              </span>
            </button>
          </div>
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}
