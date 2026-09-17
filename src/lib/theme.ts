export const THEME_STORAGE_KEY = "sd-theme";
export const THEME_COOKIE = "sd-theme";
export const THEME_RESOLVED_COOKIE = "sd-theme-resolved";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export function isThemePreference(value: string | null | undefined): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

export function isResolvedTheme(value: string | null | undefined): value is ResolvedTheme {
  return value === "light" || value === "dark";
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === "light" || preference === "dark") {
    return preference;
  }

  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function writeThemeCookies(preference: ThemePreference, resolved: ResolvedTheme): void {
  document.cookie = `${THEME_COOKIE}=${encodeURIComponent(preference)}; path=/; max-age=31536000; SameSite=Lax`;
  document.cookie = `${THEME_RESOLVED_COOKIE}=${encodeURIComponent(resolved)}; path=/; max-age=31536000; SameSite=Lax`;
}

export function applyTheme(preference: ThemePreference): ResolvedTheme {
  const resolved = resolveTheme(preference);
  const root = document.documentElement;

  root.setAttribute("data-theme", resolved);
  root.classList.toggle("dark", resolved === "dark");
  localStorage.setItem(THEME_STORAGE_KEY, preference);
  writeThemeCookies(preference, resolved);

  return resolved;
}

export function themeFromCookies(
  preference: string | undefined,
  resolved: string | undefined,
): ResolvedTheme {
  if (isResolvedTheme(resolved)) {
    return resolved;
  }

  if (preference === "dark" || preference === "light") {
    return preference;
  }

  return "light";
}
