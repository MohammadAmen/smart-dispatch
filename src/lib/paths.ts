import { DEFAULT_LOCALE, isLocale } from "@/i18n/config";
import type { Locale } from "@/lib/localized";

export function stripLocalePrefix(pathname: string): string {
  const stripped = pathname.replace(/^\/(ar|en)(?=\/|$)/, "");
  return stripped.length === 0 ? "/" : stripped;
}

export function resolvePathLocale(value: string | null | undefined): Locale {
  const code = value?.replace(/^\/+/, "") ?? "";
  return isLocale(code) ? code : DEFAULT_LOCALE;
}

export function withLocalePrefix(pathname: string, locale?: string | null): string {
  const code = resolvePathLocale(locale);
  const stripped = stripLocalePrefix(pathname);
  return stripped === "/" ? `/${code}` : `/${code}${stripped}`;
}

export function isSafeInternalPath(value: string | null | undefined): value is string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return false;
  }

  return !value.startsWith("/login");
}

export function isDispatchPath(pathname: string): boolean {
  return stripLocalePrefix(pathname) === "/dashboard";
}
