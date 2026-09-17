"use client";

import { Languages } from "lucide-react";
import type { ReactNode } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LocaleToggle({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}): ReactNode {
  const { locale, setLocale, t } = useLocale();
  const next = locale === "ar" ? "en" : "ar";

  return (
    <Button
      variant="ghost"
      size={compact ? "icon" : "sm"}
      onPress={() => setLocale(next)}
      aria-label={t("common.language")}
      className={cn(compact ? "size-8" : "gap-1.5 px-2.5", className)}
    >
      {compact ? (
        <span className="text-[11px] font-semibold tracking-wide">
          {locale === "ar" ? "EN" : "ع"}
        </span>
      ) : (
        <>
          <Languages className="size-4" />
          <span className="text-xs font-medium">
            {locale === "ar" ? t("common.english") : t("common.arabic")}
          </span>
        </>
      )}
    </Button>
  );
}
