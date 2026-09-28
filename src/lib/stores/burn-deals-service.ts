import "server-only";

import { prisma } from "@/lib/db";
import {
  BURN_DEALS_CACHE_MS,
  BURN_DEALS_PER_STORE,
  type BurnDealProduct,
  type BurnDealStore,
  type BurnDealsFeed,
} from "@/lib/stores/burn-deals-types";
import { primaryProductImage } from "@/lib/stores/product-images";
import { discountPercentOff, isDiscountedProduct } from "@/lib/stores/pricing";

type CacheEntry = {
  at: number;
  data: BurnDealsFeed;
};

const cache = new Map<string, CacheEntry>();

function cacheKey(categoryType: string): string {
  return categoryType.trim().toUpperCase() || "ALL";
}

function isAllCategory(categoryType: string): boolean {
  const value = categoryType.trim();
  return !value || value === "ALL" || value === "all";
}

/**
 * One discounted-products query, grouped in memory into store mega-deal cards.
 * Top products per store are ranked by discount percent (highest first).
 */
export async function getBurnDealsFeed(categoryType = "ALL"): Promise<BurnDealsFeed> {
  const key = cacheKey(categoryType);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < BURN_DEALS_CACHE_MS) {
    return hit.data;
  }

  const storeFilter = isAllCategory(categoryType)
    ? { active: true as const }
    : { active: true as const, storeTypeId: categoryType.trim() };

  const rows = await prisma.product.findMany({
    where: {
      available: true,
      hasDiscount: true,
      discountPrice: { not: null },
      store: storeFilter,
    },
    select: {
      id: true,
      name: true,
      price: true,
      hasDiscount: true,
      discountPrice: true,
      imageUrl: true,
      images: true,
      storeId: true,
      store: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
          coverImage: true,
          storeTypeId: true,
        },
      },
    },
  });

  const buckets = new Map<
    string,
    {
      storeId: string;
      storeName: string;
      storeLogoUrl: string | null;
      storeCoverImage: string | null;
      storeTypeId: string | null;
      products: BurnDealProduct[];
    }
  >();

  for (const row of rows) {
    if (!isDiscountedProduct(row) || row.discountPrice == null) {
      continue;
    }
    const percent = discountPercentOff(row);
    if (percent == null) {
      continue;
    }

    const product: BurnDealProduct = {
      id: row.id,
      name: row.name,
      price: row.price,
      discountPrice: row.discountPrice,
      imageUrl: primaryProductImage(row),
      discountPercent: percent,
    };

    const current = buckets.get(row.storeId);
    if (current) {
      current.products.push(product);
      continue;
    }

    buckets.set(row.storeId, {
      storeId: row.store.id,
      storeName: row.store.name,
      storeLogoUrl: row.store.logoUrl,
      storeCoverImage: row.store.coverImage,
      storeTypeId: row.store.storeTypeId,
      products: [product],
    });
  }

  const stores: BurnDealStore[] = [...buckets.values()]
    .map((bucket) => {
      const ranked = bucket.products
        .slice()
        .sort((left, right) => right.discountPercent - left.discountPercent);
      return {
        storeId: bucket.storeId,
        storeName: bucket.storeName,
        storeLogoUrl: bucket.storeLogoUrl,
        storeCoverImage: bucket.storeCoverImage,
        storeTypeId: bucket.storeTypeId,
        dealsCount: ranked.length,
        products: ranked.slice(0, BURN_DEALS_PER_STORE),
      };
    })
    .filter((store) => store.products.length > 0)
    .sort((left, right) => {
      const leftMax = left.products[0]?.discountPercent ?? 0;
      const rightMax = right.products[0]?.discountPercent ?? 0;
      if (rightMax !== leftMax) {
        return rightMax - leftMax;
      }
      return right.dealsCount - left.dealsCount;
    });

  const data: BurnDealsFeed = { stores };
  cache.set(key, { at: Date.now(), data });
  return data;
}

/** Test helper / admin refresh — clears TTL cache. */
export function clearBurnDealsCache(): void {
  cache.clear();
}
