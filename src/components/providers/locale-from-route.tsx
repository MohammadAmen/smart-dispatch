"use client";

import { useEffect } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import type { Locale } from "@/lib/localized";

export function LocaleFromRoute({ locale }: { locale: Locale }): null {
  const { locale: current, setLocale } = useLocale();

  useEffect(() => {
    if (current !== locale) {
      setLocale(locale);
    }
  }, [current, locale, setLocale]);

  return null;
}
