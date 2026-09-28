import type { BurnDealStore, BurnDealsFeed } from "@/lib/stores/burn-deals-types";

export const BURN_DEALS_KEY_PREFIX = "/api/deals/burn";

export function burnDealsKey(categoryType: string, subCategoryId: string | null = null): string {
  const category = categoryType.trim() || "ALL";
  const sub = subCategoryId?.trim() || "all";
  return `${BURN_DEALS_KEY_PREFIX}?categoryType=${encodeURIComponent(category)}&sub=${encodeURIComponent(sub)}`;
}

function normalizeStore(value: unknown): BurnDealStore | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const row = value as Partial<BurnDealStore>;
  if (typeof row.storeId !== "string" || typeof row.storeName !== "string") {
    return null;
  }
  const products = Array.isArray(row.products)
    ? (row.products as unknown[]).flatMap((item) => {
        if (typeof item !== "object" || item === null) {
          return [];
        }
        const product = item as Record<string, unknown>;
        if (typeof product.id !== "string" || typeof product.name !== "string") {
          return [];
        }
        const price = typeof product.price === "number" ? product.price : 0;
        const discountPrice =
          typeof product.discountPrice === "number" ? product.discountPrice : price;
        const discountPercent =
          typeof product.discountPercent === "number" ? product.discountPercent : 0;
        return [
          {
            id: product.id,
            name: product.name,
            price,
            discountPrice,
            imageUrl: typeof product.imageUrl === "string" ? product.imageUrl : null,
            discountPercent,
          },
        ];
      })
    : [];

  return {
    storeId: row.storeId,
    storeName: row.storeName,
    storeLogoUrl: typeof row.storeLogoUrl === "string" ? row.storeLogoUrl : null,
    storeCoverImage: typeof row.storeCoverImage === "string" ? row.storeCoverImage : null,
    storeTypeId: typeof row.storeTypeId === "string" ? row.storeTypeId : null,
    storeTypeName: typeof row.storeTypeName === "string" ? row.storeTypeName : null,
    dealsCount: typeof row.dealsCount === "number" ? row.dealsCount : products.length,
    products,
  };
}

export async function fetchBurnDeals(
  categoryType: string,
  subCategoryId: string | null = null,
): Promise<BurnDealsFeed> {
  const params = new URLSearchParams({
    categoryType: categoryType.trim() || "ALL",
  });
  if (subCategoryId?.trim()) {
    params.set("subCategoryId", subCategoryId.trim());
  }
  const response = await fetch(`${BURN_DEALS_KEY_PREFIX}?${params.toString()}`, {
    cache: "no-store",
  });
  const body = (await response.json()) as { ok?: boolean; stores?: unknown };
  if (!body.ok) {
    throw new Error("Could not load burn deals.");
  }
  const stores = Array.isArray(body.stores)
    ? body.stores.flatMap((item) => {
        const store = normalizeStore(item);
        return store ? [store] : [];
      })
    : [];
  return { stores };
}
