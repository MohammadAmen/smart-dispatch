import type { DiscoveryFeed, DiscoveryProduct } from "@/lib/stores/discovery-types";
import type { ProductOptionGroupRecord } from "@/lib/stores/product-options";

export const DISCOVERY_KEY_PREFIX = "/api/discovery";

export function discoveryKey(
  category: string,
  lat: number | null,
  lng: number | null,
  subCategoryId: string | null = null,
): string {
  const cat = category.trim() || "ALL";
  const location =
    lat != null && lng != null ? `${lat.toFixed(3)},${lng.toFixed(3)}` : "none";
  const sub = subCategoryId?.trim() || "all";
  return `${DISCOVERY_KEY_PREFIX}?category=${encodeURIComponent(cat)}&sub=${encodeURIComponent(sub)}&loc=${location}&v=3`;
}

function asOptionGroups(value: unknown): ProductOptionGroupRecord[] {
  return Array.isArray(value) ? (value as ProductOptionGroupRecord[]) : [];
}

function normalizeProduct(value: unknown): DiscoveryProduct | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const row = value as Partial<DiscoveryProduct>;
  if (typeof row.id !== "string" || typeof row.name !== "string" || typeof row.storeId !== "string") {
    return null;
  }
  return {
    id: row.id,
    name: row.name,
    description: typeof row.description === "string" ? row.description : "",
    price: typeof row.price === "number" ? row.price : 0,
    hasDiscount: row.hasDiscount === true,
    discountPrice: typeof row.discountPrice === "number" ? row.discountPrice : null,
    imageUrl: typeof row.imageUrl === "string" ? row.imageUrl : null,
    images: Array.isArray(row.images)
      ? row.images.filter((item): item is string => typeof item === "string")
      : [],
    soldCount: typeof row.soldCount === "number" ? row.soldCount : 0,
    storeId: row.storeId,
    storeName: typeof row.storeName === "string" ? row.storeName : "",
    storeLogoUrl: typeof row.storeLogoUrl === "string" ? row.storeLogoUrl : null,
    storeLat: typeof row.storeLat === "number" ? row.storeLat : null,
    storeLng: typeof row.storeLng === "number" ? row.storeLng : null,
    distanceKm: typeof row.distanceKm === "number" ? row.distanceKm : null,
    badge: row.badge === "DEAL" || row.badge === "NEW" || row.badge === "TRENDING" ? row.badge : "TRENDING",
    optionGroups: asOptionGroups(row.optionGroups),
  };
}

function normalizeList(value: unknown): DiscoveryProduct[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => {
    const product = normalizeProduct(item);
    return product ? [product] : [];
  });
}

export async function fetchDiscoveryFeed(
  category: string,
  lat: number | null,
  lng: number | null,
  subCategoryId: string | null = null,
): Promise<DiscoveryFeed> {
  const params = new URLSearchParams({
    category: category.trim() || "ALL",
  });
  if (lat != null && lng != null) {
    params.set("lat", String(lat));
    params.set("lng", String(lng));
  }
  if (subCategoryId?.trim()) {
    params.set("subCategoryId", subCategoryId.trim());
  }

  const response = await fetch(`${DISCOVERY_KEY_PREFIX}?${params.toString()}`, {
    cache: "no-store",
  });
  const body = (await response.json()) as Partial<DiscoveryFeed> & { ok?: boolean };
  if (!body.ok) {
    throw new Error("Could not load discovery feed.");
  }

  return {
    trending: normalizeList(body.trending),
    deals: normalizeList(body.deals),
    newArrivals: normalizeList(body.newArrivals),
    curated: normalizeList(body.curated),
  };
}
