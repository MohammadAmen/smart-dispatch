"use client";

import { useLocale } from "@/components/providers/locale-provider";

export function useTranslations(): (path: string, vars?: Record<string, string | number>) => string {
  return useLocale().t;
}
