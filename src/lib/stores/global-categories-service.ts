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
 * Unified sub-categories for a store sector.
 * The admin catalog for that sector is always listed. Store links (for filtering)
 * come from the same active stores the home directory shows — distance only
 * changes sort, it does not hide the catalog.
 * Unlinked store categories still appear as name-based fallback pills.
 */
export async function listNearbySubCategories(input: {
  mainCategoryId: string;
  lat?: number | null;
  lng?: number | null;
  radiusKm?: number;
}): Promise<SubCategoriesFeed> {
  try {
    await ensureGlobalCategoriesReady();
  } catch (error) {
    console.error("[sub-categories] seed skipped", error);
  }

  const rawMain = input.mainCategoryId.trim();
  const isAll = !rawMain || rawMain === "all" || rawMain === "ALL";
  const mainCategoryId = isAll ? "ALL" : rawMain;

  const userLat = parseCoord(input.lat);
  const userLng = parseCoord(input.lng);
  const radius = input.radiusKm ?? SUB_CATEGORY_GEO_RADIUS_KM;

  const defined = await prisma.globalCategory.findMany({
    where: {
      active: true,
      ...(isAll ? {} : { storeTypeId: mainCategoryId }),
    },
    select: {
      id: true,
      name: true,
      icon: true,
      imageUrl: true,
      isOther: true,
      sortOrder: true,
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  const stores = await prisma.store.findMany({
    where: {
      active: true,
      ...(isAll ? {} : { storeTypeId: mainCategoryId }),
    },
    select: {
      id: true,
      latitude: true,
      longitude: true,
    },
  });

  const nearbyIds = new Set(
    stores
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
      .map((store) => store.id),
  );

  const storeIds = stores.map((store) => store.id);
  const categories =
    storeIds.length === 0
      ? []
      : await prisma.category.findMany({
          where: {
            storeId: { in: storeIds },
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
      nearbyCount: number;
    }
  >();

  for (const global of defined) {
    globalBuckets.set(global.id, {
      id: global.id,
      name: global.name,
      icon: global.icon || "📦",
      imageUrl: global.imageUrl,
      isOther: global.isOther,
      sortOrder: global.sortOrder,
      storeIds: new Set(),
      nearbyCount: 0,
    });
  }

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
        if (!current.imageUrl && category.imageUrl) {
          current.imageUrl = category.imageUrl;
        }
        if (nearbyIds.has(category.storeId)) {
          current.nearbyCount += 1;
        }
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
        nearbyCount: nearbyIds.has(category.storeId) ? 1 : 0,
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

  const globalNames = new Set(
    [...globalBuckets.values()].map((item) => item.name.trim().toLowerCase()),
  );

  const globals: PublicSubCategory[] = [...globalBuckets.values()]
    .sort((left, right) => {
      if (left.isOther !== right.isOther) {
        return left.isOther ? 1 : -1;
      }
      if (left.sortOrder !== right.sortOrder) {
        return left.sortOrder - right.sortOrder;
      }
      if (left.nearbyCount !== right.nearbyCount) {
        return right.nearbyCount - left.nearbyCount;
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
    .filter((item) => !globalNames.has(item.name.trim().toLowerCase()))
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
