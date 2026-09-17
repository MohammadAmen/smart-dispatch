export const MENU_VIEW_STORAGE_KEY = "sd-menu-view-v2";

export const MENU_VIEW_MODES = ["large", "list", "dense"] as const;

export type MenuViewMode = (typeof MENU_VIEW_MODES)[number];

export const DEFAULT_MENU_VIEW: MenuViewMode = "dense";

export function isMenuViewMode(value: unknown): value is MenuViewMode {
  return typeof value === "string" && (MENU_VIEW_MODES as readonly string[]).includes(value);
}

export function readMenuViewMode(): MenuViewMode {
  if (typeof window === "undefined") {
    return DEFAULT_MENU_VIEW;
  }

  try {
    const raw = window.localStorage.getItem(MENU_VIEW_STORAGE_KEY);
    return isMenuViewMode(raw) ? raw : DEFAULT_MENU_VIEW;
  } catch {
    return DEFAULT_MENU_VIEW;
  }
}

export function writeMenuViewMode(mode: MenuViewMode): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(MENU_VIEW_STORAGE_KEY, mode);
  } catch {
    // Private mode can block storage.
  }
}

export function menuProductGridClass(mode: MenuViewMode): string {
  if (mode === "list") {
    return "flex flex-col gap-2.5";
  }
  if (mode === "dense") {
    return "grid grid-cols-2 gap-2.5";
  }
  return "grid grid-cols-1 gap-3";
}
