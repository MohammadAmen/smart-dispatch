"use client";

const PREFIX = "beev-menu-cache-v1:";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

export function readMenuCache<T>(key: string): T | null {
  if (!canUseStorage()) {
    return null;
  }
  try {
    const raw = window.sessionStorage.getItem(`${PREFIX}${key}`);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeMenuCache<T>(key: string, value: T): void {
  if (!canUseStorage()) {
    return;
  }
  try {
    window.sessionStorage.setItem(`${PREFIX}${key}`, JSON.stringify(value));
  } catch {
    // Quota / private mode — ignore.
  }
}

export const MENU_HOME_CACHE_KEY = "home-directory";
export const MENU_ORDERS_CACHE_KEY = "orders-list";
