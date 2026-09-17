export const SAVED_STORES_KEY = "sd-saved-stores-v1";

export interface SavedStore {
  id: string;
  name: string;
  logoUrl: string | null;
  coverImage: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
}

function asSaved(value: unknown): SavedStore | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string" || typeof row.name !== "string") {
    return null;
  }
  return {
    id: row.id,
    name: row.name,
    logoUrl: typeof row.logoUrl === "string" ? row.logoUrl : null,
    coverImage: typeof row.coverImage === "string" ? row.coverImage : null,
    address: typeof row.address === "string" ? row.address : null,
    city: typeof row.city === "string" ? row.city : null,
    phone: typeof row.phone === "string" ? row.phone : null,
  };
}

export function readSavedStores(): SavedStore[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(SAVED_STORES_KEY);
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.flatMap((entry) => {
      const store = asSaved(entry);
      return store ? [store] : [];
    });
  } catch {
    return [];
  }
}

export function savedStoreFromStory(store: {
  storeId: string;
  storeName: string;
  storeLogoUrl: string | null;
  storeCoverImage?: string | null;
  storePhone?: string | null;
  storeAddress?: string | null;
  storeCity?: string | null;
}): SavedStore {
  return {
    id: store.storeId,
    name: store.storeName,
    logoUrl: store.storeLogoUrl,
    coverImage: store.storeCoverImage ?? null,
    address: store.storeAddress ?? null,
    city: store.storeCity ?? null,
    phone: store.storePhone ?? null,
  };
}

export function writeSavedStores(stores: SavedStore[]): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(SAVED_STORES_KEY, JSON.stringify(stores));
  } catch {
    // Private mode can block storage.
  }
}
