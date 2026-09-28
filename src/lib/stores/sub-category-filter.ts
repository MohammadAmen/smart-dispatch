import "server-only";

import { prisma } from "@/lib/db";
import {
  parseFallbackSubCategoryId,
  slugifyCategoryLabel,
} from "@/lib/stores/global-categories-seed";

function typeStoreFilter(typeId?: string | null):
  | { store: { active: true; storeTypeId: string } }
  | { store: { active: true } } {
  return typeId && typeId !== "all" && typeId !== "ALL"
    ? { store: { active: true as const, storeTypeId: typeId } }
    : { store: { active: true as const } };
}

/**
 * Resolves store IDs that have available products under a unified or fallback sub-category.
 * `null` = no filter. `[]` = no matches.
 */
export async function resolveStoreIdsForSubCategory(
  subCategoryId: string | null | undefined,
  typeId?: string | null,
): Promise<string[] | null> {
  const categoryIds = await resolveCategoryIdsForSubCategory(subCategoryId, typeId);
  if (categoryIds == null) {
    return null;
  }
  if (categoryIds.length === 0) {
    return [];
  }

  const rows = await prisma.category.findMany({
    where: {
      id: { in: categoryIds },
      active: true,
      products: { some: { available: true } },
      ...typeStoreFilter(typeId),
    },
    select: { storeId: true },
  });

  return [...new Set(rows.map((row) => row.storeId))];
}

/**
 * Resolves store Category row IDs that belong to a global/fallback sub-category.
 * Use on Product.where as `{ categoryId: { in: ids } }` for true product-level filtering.
 * `null` = no filter. `[]` = no matches.
 */
export async function resolveCategoryIdsForSubCategory(
  subCategoryId: string | null | undefined,
  typeId?: string | null,
): Promise<string[] | null> {
  const id = subCategoryId?.trim() ?? "";
  if (!id || id === "all" || id === "ALL") {
    return null;
  }

  const typeFilter = typeStoreFilter(typeId);
  const fallbackSlug = parseFallbackSubCategoryId(id);

  if (fallbackSlug) {
    const rows = await prisma.category.findMany({
      where: {
        active: true,
        globalCategoryId: null,
        products: { some: { available: true } },
        ...typeFilter,
      },
      select: { id: true, name: true },
    });
    return rows
      .filter((row) => slugifyCategoryLabel(row.name) === fallbackSlug)
      .map((row) => row.id);
  }

  const rows = await prisma.category.findMany({
    where: {
      active: true,
      globalCategoryId: id,
      products: { some: { available: true } },
      ...typeFilter,
    },
    select: { id: true },
  });

  return rows.map((row) => row.id);
}

/** Prisma `where` fragment for products in a sub-category. */
export async function productSubCategoryWhere(
  subCategoryId: string | null | undefined,
  typeId?: string | null,
): Promise<{ categoryId: { in: string[] } } | Record<string, never> | { id: { in: [] } }> {
  const categoryIds = await resolveCategoryIdsForSubCategory(subCategoryId, typeId);
  if (categoryIds == null) {
    return {};
  }
  if (categoryIds.length === 0) {
    return { id: { in: [] } };
  }
  return { categoryId: { in: categoryIds } };
}
