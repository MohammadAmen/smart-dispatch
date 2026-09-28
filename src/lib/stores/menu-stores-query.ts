import type { DirectoryStore } from "@/lib/stores/types";

export const MENU_STORES_KEY_PREFIX = "/api/menu/stores";

export function menuStoresKey(
  typeId: string,
  subCategoryId: string | null,
): string {
  const type = typeId.trim() || "all";
  const sub = subCategoryId?.trim() || "all";
  return `${MENU_STORES_KEY_PREFIX}?typeId=${encodeURIComponent(type)}&subCategoryId=${encodeURIComponent(sub)}`;
}

export async function fetchMenuStores(
  typeId: string,
  subCategoryId: string | null,
): Promise<DirectoryStore[]> {
  const params = new URLSearchParams({
    typeId: typeId.trim() || "all",
  });
  if (subCategoryId?.trim()) {
    params.set("subCategoryId", subCategoryId.trim());
  }

  const response = await fetch(`${MENU_STORES_KEY_PREFIX}?${params.toString()}`, {
    cache: "no-store",
  });
  const body = (await response.json()) as { ok?: boolean; stores?: DirectoryStore[] };
  if (!body.ok || !Array.isArray(body.stores)) {
    throw new Error("Could not load stores.");
  }
  return body.stores;
}
