const PREFIX = "sd-menu-session";

function randomSessionCode(): string {
  return String(1000 + Math.floor(Math.random() * 9000));
}

export function readOrCreateMenuSession(storeId: string, tableId: string | null): string {
  if (typeof window === "undefined") {
    return "";
  }

  const key = `${PREFIX}:${storeId}:${tableId ?? "open"}`;
  try {
    const existing = window.sessionStorage.getItem(key)?.trim();
    if (existing) {
      return existing;
    }
    const next = randomSessionCode();
    window.sessionStorage.setItem(key, next);
    return next;
  } catch {
    return randomSessionCode();
  }
}
