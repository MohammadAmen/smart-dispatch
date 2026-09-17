export const MENU_CART_KEY = "sd-menu-cart-v2";

export interface MenuCartLine {
  lineKey: string;
  productId: string;
  storeId: string;
  storeName: string;
  storeLogoUrl: string | null;
  storeLat: number | null;
  storeLng: number | null;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string | null;
  optionValueIds: string[];
  optionSummary: string;
  note: string;
}

export interface MenuCartSnapshot {
  lines: MenuCartLine[];
  storeNotes: Record<string, string>;
}

export function emptyCartSnapshot(): MenuCartSnapshot {
  return { lines: [], storeNotes: {} };
}

export function baseCartExtras(
  productId: string,
): Pick<MenuCartLine, "lineKey" | "optionValueIds" | "optionSummary" | "note"> {
  return { lineKey: productId, optionValueIds: [], optionSummary: "", note: "" };
}

function asLine(value: unknown): MenuCartLine | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const row = value as Record<string, unknown>;
  if (typeof row.productId !== "string" || typeof row.storeId !== "string" || typeof row.name !== "string") {
    return null;
  }
  const quantity = typeof row.quantity === "number" ? row.quantity : 0;
  const price = typeof row.price === "number" ? row.price : 0;
  if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(price) || price < 0) {
    return null;
  }
  const optionValueIds = Array.isArray(row.optionValueIds)
    ? row.optionValueIds.filter((item): item is string => typeof item === "string")
    : [];
  const note = typeof row.note === "string" ? row.note : "";
  return {
    lineKey: typeof row.lineKey === "string" && row.lineKey ? row.lineKey : row.productId,
    productId: row.productId,
    storeId: row.storeId,
    storeName: typeof row.storeName === "string" ? row.storeName : "",
    storeLogoUrl: typeof row.storeLogoUrl === "string" ? row.storeLogoUrl : null,
    storeLat: typeof row.storeLat === "number" && Number.isFinite(row.storeLat) ? row.storeLat : null,
    storeLng: typeof row.storeLng === "number" && Number.isFinite(row.storeLng) ? row.storeLng : null,
    name: row.name,
    price,
    quantity: Math.min(99, Math.round(quantity)),
    imageUrl: typeof row.imageUrl === "string" ? row.imageUrl : null,
    optionValueIds,
    optionSummary: typeof row.optionSummary === "string" ? row.optionSummary : "",
    note,
  };
}

export function readCartSnapshot(): MenuCartSnapshot {
  const fallback = emptyCartSnapshot();
  if (typeof window === "undefined") {
    return fallback;
  }
  try {
    const raw = window.localStorage.getItem(MENU_CART_KEY);
    if (!raw) {
      return fallback;
    }
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return fallback;
    }
    const row = parsed as Record<string, unknown>;
    const lines = Array.isArray(row.lines)
      ? row.lines.flatMap((entry) => {
          const line = asLine(entry);
          return line ? [line] : [];
        })
      : [];
    const notes: Record<string, string> = {};
    if (typeof row.storeNotes === "object" && row.storeNotes !== null) {
      for (const [key, value] of Object.entries(row.storeNotes as Record<string, unknown>)) {
        if (typeof value === "string") {
          notes[key] = value;
        }
      }
    }
    return { lines, storeNotes: notes };
  } catch {
    return fallback;
  }
}

export function writeCartSnapshot(snapshot: MenuCartSnapshot): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(MENU_CART_KEY, JSON.stringify(snapshot));
  } catch {
    // Private mode can block storage.
  }
}

export function cartTotals(lines: MenuCartLine[]): { itemCount: number; subtotal: number } {
  return {
    itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
    subtotal: lines.reduce((sum, line) => sum + line.price * line.quantity, 0),
  };
}

export function quantityForProduct(lines: MenuCartLine[], productId: string): number {
  return lines
    .filter((line) => line.productId === productId)
    .reduce((sum, line) => sum + line.quantity, 0);
}

export function lastLineKeyForProduct(lines: MenuCartLine[], productId: string): string | null {
  const match = [...lines].reverse().find((line) => line.productId === productId);
  return match?.lineKey ?? null;
}

export interface CartStoreGroup {
  storeId: string;
  storeName: string;
  storeLogoUrl: string | null;
  storeLat: number | null;
  storeLng: number | null;
  lines: MenuCartLine[];
  subtotal: number;
}

export function groupCartByStore(lines: MenuCartLine[]): CartStoreGroup[] {
  const groups = new Map<string, CartStoreGroup>();
  for (const line of lines) {
    const current = groups.get(line.storeId);
    if (current) {
      current.lines.push(line);
      current.subtotal += line.price * line.quantity;
      continue;
    }
    groups.set(line.storeId, {
      storeId: line.storeId,
      storeName: line.storeName,
      storeLogoUrl: line.storeLogoUrl,
      storeLat: line.storeLat,
      storeLng: line.storeLng,
      lines: [line],
      subtotal: line.price * line.quantity,
    });
  }
  return [...groups.values()];
}
