import type { Locale } from "@/lib/localized";

const localeTag = (locale: Locale): string => (locale === "ar" ? "ar-JO" : "en-JO");

export function formatJod(value: number, locale: Locale): string {
  return new Intl.NumberFormat(localeTag(locale), {
    style: "currency",
    currency: "JOD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatCount(value: number, locale: Locale): string {
  return new Intl.NumberFormat(localeTag(locale)).format(value);
}

export function formatMinutes(value: number, locale: Locale): string {
  return `${formatCount(value, locale)}`;
}

export function formatPct(value: number, locale: Locale): string {
  return new Intl.NumberFormat(localeTag(locale), {
    maximumFractionDigits: 0,
  }).format(value);
}
