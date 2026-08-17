"use client";

import { Languages } from "lucide-react";
import type { ReactNode } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LocaleToggle({ className }: { className?: string }): ReactNode {
  const { locale, setLocale, t } = useLocale();
  const next = locale === "ar" ? "en" : "ar";

  return (
    <Button
      variant="ghost"
      size="sm"
      onPress={() => setLocale(next)}
      aria-label={t("common.language")}
      className={cn("gap-1.5 px-2.5", className)}
    >
      <Languages className="size-4" />
      <span className="text-xs font-medium">
        {locale === "ar" ? t("common.english") : t("common.arabic")}
      </span>
    </Button>
  );
}
