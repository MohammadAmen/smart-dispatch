import type { Locale } from "@/lib/localized";

export const LOCALES = ["ar", "en"] as const;

export const DEFAULT_LOCALE: Locale = "ar";

export const LOCALE_COOKIE = "sd-locale";

export const LOCALE_STORAGE_KEY = "sd-locale";

export const localeDirection: Record<Locale, "rtl" | "ltr"> = {
  ar: "rtl",
  en: "ltr",
};

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "ar" || value === "en";
}

export function localeFromCookieHeader(header: string | null): Locale {
  if (!header) {
    return DEFAULT_LOCALE;
  }

  const match = header.match(new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE}=([^;]*)`));
  const value = match ? decodeURIComponent(match[1]) : null;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export function applyLocale(locale: Locale): void {
  const root = document.documentElement;
  root.lang = locale;
  root.dir = localeDirection[locale];
  localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  document.cookie = `${LOCALE_COOKIE}=${encodeURIComponent(locale)}; path=/; max-age=31536000; SameSite=Lax`;
}

export const LOCALE_BOOTSTRAP_SCRIPT = `(function(){try{var k=${JSON.stringify(LOCALE_STORAGE_KEY)};var stored=localStorage.getItem(k);var cookie=document.cookie.match(/(?:^|; )${LOCALE_COOKIE}=([^;]*)/);var fromCookie=cookie?decodeURIComponent(cookie[1]):null;var loc=stored==="en"||stored==="ar"?stored:(fromCookie==="en"||fromCookie==="ar"?fromCookie:${JSON.stringify(DEFAULT_LOCALE)});var r=document.documentElement;r.lang=loc;r.dir=loc==="ar"?"rtl":"ltr";}catch(e){}})();`;
