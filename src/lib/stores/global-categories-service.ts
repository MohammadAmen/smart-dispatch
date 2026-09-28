import "server-only";

import { calculateDistance } from "@/lib/geo";
import { prisma } from "@/lib/db";
import {
  ensureGlobalCategoriesReady,
  fallbackSubCategoryId,
} from "@/lib/stores/global-categories-seed";
import {
  SUB_CATEGORY_GEO_RADIUS_KM,
  type PublicSubCategory,
  type SubCategoriesFeed,
} from "@/lib/stores/global-categories-types";

function parseCoord(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Unified sub-categories visible for a main store-type near the user.
 * Unlinked store categories still appear as name-based fallback pills.
 */
export async function listNearbySubCategories(input: {
  mainCategoryId: string;
  lat?: number | null;
  lng?: number | null;
  radiusKm?: number;
}): Promise<SubCategoriesFeed> {
  await ensureGlobalCategoriesReady();

  const mainCategoryId = input.mainCategoryId.trim();
  if (!mainCategoryId || mainCategoryId === "all" || mainCategoryId === "ALL") {
    return { mainCategoryId: "ALL", items: [] };
  }

  const userLat = parseCoord(input.lat);
  const userLng = parseCoord(input.lng);
  const radius = input.radiusKm ?? SUB_CATEGORY_GEO_RADIUS_KM;

  const stores = await prisma.store.findMany({
    where: {
      active: true,
      storeTypeId: mainCategoryId,
    },
    select: {
      id: true,
      latitude: true,
      longitude: true,
    },
  });

  const nearbyIds = stores
    .filter((store) => {
      if (userLat == null || userLng == null) {
        return true;
      }
      if (store.latitude == null || store.longitude == null) {
        return true;
      }
      const km = calculateDistance(userLat, userLng, store.latitude, store.longitude);
      return Number.isFinite(km) && km <= radius;
    })
    .map((store) => store.id);

  if (nearbyIds.length === 0) {
    return { mainCategoryId, items: [] };
  }

  const categories = await prisma.category.findMany({
    where: {
      storeId: { in: nearbyIds },
      active: true,
      products: { some: { available: true } },
    },
    select: {
      id: true,
      name: true,
      icon: true,
      imageUrl: true,
      storeId: true,
      globalCategoryId: true,
      globalCategory: {
        select: {
          id: true,
          name: true,
          icon: true,
          imageUrl: true,
          isOther: true,
          sortOrder: true,
          active: true,
        },
      },
    },
  });

  const globalBuckets = new Map<
    string,
    {
      id: string;
      name: string;
      icon: string;
      imageUrl: string | null;
      isOther: boolean;
      sortOrder: number;
      storeIds: Set<string>;
    }
  >();

  const fallbackBuckets = new Map<
    string,
    {
      id: string;
      name: string;
      icon: string;
      imageUrl: string | null;
      storeIds: Set<string>;
    }
  >();

  for (const category of categories) {
    if (category.globalCategoryId && category.globalCategory?.active) {
      const global = category.globalCategory;
      const current = globalBuckets.get(global.id);
      if (current) {
        current.storeIds.add(category.storeId);
        continue;
      }
      globalBuckets.set(global.id, {
        id: global.id,
        name: global.name,
        icon: global.icon || category.icon || "📦",
        imageUrl: global.imageUrl ?? category.imageUrl,
        isOther: global.isOther,
        sortOrder: global.sortOrder,
        storeIds: new Set([category.storeId]),
      });
      continue;
    }

    // Fallback: keep the local store category name visible so nothing disappears.
    const key = category.name.trim().toLowerCase();
    if (!key) {
      continue;
    }
    const fallbackId = fallbackSubCategoryId(category.name);
    const current = fallbackBuckets.get(key);
    if (current) {
      current.storeIds.add(category.storeId);
      continue;
    }
    fallbackBuckets.set(key, {
      id: fallbackId,
      name: category.name.trim(),
      icon: category.icon?.trim() || "📦",
      imageUrl: category.imageUrl,
      storeIds: new Set([category.storeId]),
    });
  }

  const globals: PublicSubCategory[] = [...globalBuckets.values()]
    .sort((left, right) => {
      if (left.isOther !== right.isOther) {
        return left.isOther ? 1 : -1;
      }
      if (left.sortOrder !== right.sortOrder) {
        return left.sortOrder - right.sortOrder;
      }
      return right.storeIds.size - left.storeIds.size;
    })
    .map((item) => ({
      id: item.id,
      name: item.name,
      icon: item.icon,
      imageUrl: item.imageUrl,
      storeIds: [...item.storeIds],
      storeCount: item.storeIds.size,
      isFallback: false,
      isOther: item.isOther,
    }));

  const fallbacks: PublicSubCategory[] = [...fallbackBuckets.values()]
    .sort((left, right) => right.storeIds.size - left.storeIds.size || left.name.localeCompare(right.name, "ar"))
    .map((item) => ({
      id: item.id,
      name: item.name,
      icon: item.icon,
      imageUrl: item.imageUrl,
      storeIds: [...item.storeIds],
      storeCount: item.storeIds.size,
      isFallback: true,
      isOther: false,
    }));

  return {
    mainCategoryId,
    items: [...globals, ...fallbacks],
  };
}
