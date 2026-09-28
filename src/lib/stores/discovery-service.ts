import "server-only";

import { calculateDistance } from "@/lib/geo";
import { prisma } from "@/lib/db";
import { primaryProductImage, productImages } from "@/lib/stores/product-images";
import {
  DISCOVERY_SECTION_LIMIT,
  DISCOVERY_TRENDING_DAYS,
  type DiscoveryBadge,
  type DiscoveryFeed,
  type DiscoveryProduct,
} from "@/lib/stores/discovery-types";
import { isDiscountedProduct } from "@/lib/stores/pricing";
import type { ProductOptionGroupRecord } from "@/lib/stores/product-options";
import { loadProductOptionsByProductIds } from "@/lib/stores/product-options-store";

type ProductRow = {
  id: string;
  name: string;
  description: string;
  price: number;
  hasDiscount: boolean;
  discountPrice: number | null;
  imageUrl: string | null;
  images: unknown;
  createdAt: Date;
  store: {
    id: string;
    name: string;
    logoUrl: string | null;
    latitude: number | null;
    longitude: number | null;
    storeTypeId: string | null;
  };
};

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function parseCoord(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function distanceToStore(
  store: { latitude: number | null; longitude: number | null },
  userLat: number | null,
  userLng: number | null,
): number | null {
  if (userLat == null || userLng == null || store.latitude == null || store.longitude == null) {
    return null;
  }
  const km = calculateDistance(userLat, userLng, store.latitude, store.longitude);
  return Number.isFinite(km) ? km : null;
}

function serializeProduct(
  row: ProductRow,
  badge: DiscoveryBadge,
  soldCount: number,
  userLat: number | null,
  userLng: number | null,
  optionGroups: ProductOptionGroupRecord[] = [],
): DiscoveryProduct {
  const images = productImages(row);
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    price: row.price,
    hasDiscount: row.hasDiscount,
    discountPrice: row.discountPrice,
    imageUrl: primaryProductImage(row) ?? images[0] ?? null,
    images,
    soldCount,
    storeId: row.store.id,
    storeName: row.store.name,
    storeLogoUrl: row.store.logoUrl,
    storeLat: row.store.latitude,
    storeLng: row.store.longitude,
    distanceKm: distanceToStore(row.store, userLat, userLng),
    badge,
    optionGroups,
  };
}

function byProximityThen<T extends { distanceKm: number | null }>(
  left: T,
  right: T,
  fallback: number,
): number {
  const leftDist = left.distanceKm ?? Number.POSITIVE_INFINITY;
  const rightDist = right.distanceKm ?? Number.POSITIVE_INFINITY;
  if (leftDist !== rightDist) {
    return leftDist - rightDist;
  }
  return fallback;
}

const productSelect = {
  id: true,
  name: true,
  description: true,
  price: true,
  hasDiscount: true,
  discountPrice: true,
  imageUrl: true,
  images: true,
  createdAt: true,
  store: {
    select: {
      id: true,
      name: true,
      logoUrl: true,
      latitude: true,
      longitude: true,
      storeTypeId: true,
    },
  },
} as const;

function activeStoreFilter(category: string | null): {
  available: true;
  store: { active: true; storeTypeId?: string };
} {
  if (category && category !== "ALL" && category !== "all") {
    return {
      available: true,
      store: { active: true, storeTypeId: category },
    };
  }
  return {
    available: true,
    store: { active: true },
  };
}

/**
 * Lightweight discovery feed: three targeted queries in parallel, then
 * serialize with store metadata and optional soft proximity ranking.
 */
export async function getDiscoveryFeed(input: {
  category?: string | null;
  subCategoryId?: string | null;
  lat?: number | null;
  lng?: number | null;
}): Promise<DiscoveryFeed> {
  const category = input.category?.trim() || "ALL";
  const userLat = parseCoord(input.lat);
  const userLng = parseCoord(input.lng);
  const baseWhere = activeStoreFilter(category);
  const { resolveStoreIdsForSubCategory } = await import("@/lib/stores/sub-category-filter");
  const storeIds = await resolveStoreIdsForSubCategory(input.subCategoryId, category);

  if (storeIds && storeIds.length === 0) {
    return { trending: [], deals: [], newArrivals: [], curated: [] };
  }

  const where = {
    ...baseWhere,
    ...(storeIds ? { storeId: { in: storeIds } } : {}),
  };
  const since = daysAgo(DISCOVERY_TRENDING_DAYS);

  const [trendingAgg, dealRows, newRows] = await Promise.all([
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: {
        productId: { not: null },
        product: where,
        order: { createdAt: { gte: since } },
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: DISCOVERY_SECTION_LIMIT * 2,
    }),
    prisma.product.findMany({
      where: {
        ...where,
        hasDiscount: true,
        discountPrice: { not: null },
      },
      select: productSelect,
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      take: DISCOVERY_SECTION_LIMIT * 2,
    }),
    prisma.product.findMany({
      where,
      select: productSelect,
      orderBy: { createdAt: "desc" },
      take: DISCOVERY_SECTION_LIMIT * 2,
    }),
  ]);

  const trendingIds = trendingAgg
    .map((row) => row.productId)
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  const soldMap = new Map<string, number>();
  for (const row of trendingAgg) {
    if (!row.productId) {
      continue;
    }
    soldMap.set(row.productId, row._sum.quantity ?? 0);
  }

  const trendingProducts =
    trendingIds.length > 0
      ? await prisma.product.findMany({
          where: { id: { in: trendingIds }, ...where },
          select: productSelect,
        })
      : [];

  const trendingById = new Map(trendingProducts.map((row) => [row.id, row]));
  const trending: DiscoveryProduct[] = trendingIds
    .flatMap((id) => {
      const row = trendingById.get(id);
      if (!row) {
        return [];
      }
      return [serializeProduct(row, "TRENDING", soldMap.get(id) ?? 0, userLat, userLng)];
    })
    .sort((a, b) => byProximityThen(a, b, (b.soldCount ?? 0) - (a.soldCount ?? 0)))
    .slice(0, DISCOVERY_SECTION_LIMIT);

  const deals: DiscoveryProduct[] = dealRows
    .filter((row) => isDiscountedProduct(row))
    .map((row) => serializeProduct(row, "DEAL", soldMap.get(row.id) ?? 0, userLat, userLng))
    .sort((a, b) => {
      const aPct =
        a.discountPrice != null && a.price > 0
          ? 1 - a.discountPrice / a.price
          : 0;
      const bPct =
        b.discountPrice != null && b.price > 0
          ? 1 - b.discountPrice / b.price
          : 0;
      if (bPct !== aPct) {
        return bPct - aPct;
      }
      return byProximityThen(a, b, 0);
    })
    .slice(0, DISCOVERY_SECTION_LIMIT);

  const seenNew = new Set(trending.map((item) => item.id));
  const newArrivals: DiscoveryProduct[] = newRows
    .filter((row) => !seenNew.has(row.id) || newRows.length <= DISCOVERY_SECTION_LIMIT)
    .map((row) => serializeProduct(row, "NEW", soldMap.get(row.id) ?? 0, userLat, userLng))
    .sort((a, b) => byProximityThen(a, b, 0))
    .slice(0, DISCOVERY_SECTION_LIMIT);

  // Curated mix for "ALL": prioritize trending, fill with fresh deals + arrivals.
  const curatedIds = new Set<string>();
  const curatedBase: DiscoveryProduct[] = [];
  for (const item of [...trending, ...deals, ...newArrivals]) {
    if (curatedIds.has(item.id)) {
      continue;
    }
    curatedIds.add(item.id);
    curatedBase.push({
      ...item,
      badge: item.badge === "DEAL" ? "DEAL" : item.badge === "NEW" ? "NEW" : "TRENDING",
    });
    if (curatedBase.length >= DISCOVERY_SECTION_LIMIT) {
      break;
    }
  }

  const optionsMap = await loadProductOptionsByProductIds([
    ...trending.map((item) => item.id),
    ...deals.map((item) => item.id),
    ...newArrivals.map((item) => item.id),
    ...curatedBase.map((item) => item.id),
  ]);

  const withOptions = (list: DiscoveryProduct[]): DiscoveryProduct[] =>
    list.map((item) => ({
      ...item,
      optionGroups: optionsMap.get(item.id) ?? [],
    }));

  return {
    trending: withOptions(trending),
    deals: withOptions(deals),
    newArrivals: withOptions(newArrivals),
    curated: withOptions(curatedBase),
  };
}
