import type { PublicSubCategory, SubCategoriesFeed } from "@/lib/stores/global-categories-types";

export const SUB_CATEGORIES_KEY_PREFIX = "/api/categories/sub-categories";

export function subCategoriesKey(
  mainCategoryId: string,
  lat: number | null,
  lng: number | null,
): string {
  const main = mainCategoryId.trim() || "ALL";
  const loc = lat != null && lng != null ? `${lat.toFixed(3)},${lng.toFixed(3)}` : "none";
  return `${SUB_CATEGORIES_KEY_PREFIX}?main=${encodeURIComponent(main)}&loc=${loc}`;
}

function normalizeItem(value: unknown): PublicSubCategory | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const row = value as Partial<PublicSubCategory>;
  if (typeof row.id !== "string" || typeof row.name !== "string") {
    return null;
  }
  const storeIds = Array.isArray(row.storeIds)
    ? row.storeIds.filter((item): item is string => typeof item === "string")
    : [];
  return {
    id: row.id,
    name: row.name,
    icon: typeof row.icon === "string" && row.icon ? row.icon : "📦",
    imageUrl: typeof row.imageUrl === "string" ? row.imageUrl : null,
    storeIds,
    storeCount: typeof row.storeCount === "number" ? row.storeCount : storeIds.length,
    isFallback: row.isFallback === true,
    isOther: row.isOther === true,
  };
}

export async function fetchSubCategories(
  mainCategoryId: string,
  lat: number | null,
  lng: number | null,
): Promise<SubCategoriesFeed> {
  const params = new URLSearchParams({
    mainCategoryId: mainCategoryId.trim() || "ALL",
  });
  if (lat != null && lng != null) {
    params.set("lat", String(lat));
    params.set("lng", String(lng));
  }

  const response = await fetch(`${SUB_CATEGORIES_KEY_PREFIX}?${params.toString()}`, {
    cache: "no-store",
  });
  const body = (await response.json()) as Partial<SubCategoriesFeed> & { ok?: boolean };
  if (!body.ok) {
    throw new Error("Could not load sub-categories.");
  }

  const items = Array.isArray(body.items)
    ? body.items.flatMap((item) => {
        const normalized = normalizeItem(item);
        return normalized ? [normalized] : [];
      })
    : [];

  return {
    mainCategoryId: typeof body.mainCategoryId === "string" ? body.mainCategoryId : mainCategoryId,
    items,
  };
}
