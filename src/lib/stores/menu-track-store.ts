import { isTrackingToken, uniqueTrackingTokens } from "@/lib/stores/tracking-token";

export const MENU_TRACK_STORAGE_KEY = "sd-menu-tokens-v1";
const MAX_STORED_TOKENS = 40;

export function readTrackingTokens(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(MENU_TRACK_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return uniqueTrackingTokens(parsed).slice(0, MAX_STORED_TOKENS);
  } catch {
    return [];
  }
}

export function rememberTrackingToken(token: string): string[] {
  if (!isTrackingToken(token) || typeof window === "undefined") {
    return readTrackingTokens();
  }

  const next = uniqueTrackingTokens([token, ...readTrackingTokens()]).slice(0, MAX_STORED_TOKENS);
  try {
    window.localStorage.setItem(MENU_TRACK_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private mode can block storage.
  }
  return next;
}

export function rememberTrackingTokens(tokens: string[]): string[] {
  const next = uniqueTrackingTokens([...tokens, ...readTrackingTokens()]).slice(
    0,
    MAX_STORED_TOKENS,
  );
  if (typeof window === "undefined") {
    return next;
  }

  try {
    window.localStorage.setItem(MENU_TRACK_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private mode can block storage.
  }
  return next;
}
