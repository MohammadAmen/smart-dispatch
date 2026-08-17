export const THEME_STORAGE_KEY = "sd-theme";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export function isThemePreference(value: string | null): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === "light" || preference === "dark") {
    return preference;
  }

  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function applyTheme(preference: ThemePreference): ResolvedTheme {
  const resolved = resolveTheme(preference);
  const root = document.documentElement;

  root.setAttribute("data-theme", resolved);
  root.classList.toggle("dark", resolved === "dark");
  localStorage.setItem(THEME_STORAGE_KEY, preference);

  return resolved;
}

export const THEME_BOOTSTRAP_SCRIPT = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var stored=localStorage.getItem(k);var pref=stored==="light"||stored==="dark"||stored==="system"?stored:"system";var dark=pref==="dark"||(pref!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var t=dark?"dark":"light";var r=document.documentElement;r.setAttribute("data-theme",t);r.classList.toggle("dark",dark);}catch(e){}})();`;
