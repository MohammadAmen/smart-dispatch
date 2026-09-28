import "server-only";

import { prisma } from "@/lib/db";
import {
  parseFallbackSubCategoryId,
  slugifyCategoryLabel,
} from "@/lib/stores/global-categories-seed";

/**
 * Resolves store IDs that have available products under a unified or fallback sub-category.
 */
export async function resolveStoreIdsForSubCategory(
  subCategoryId: string | null | undefined,
  typeId?: string | null,
): Promise<string[] | null> {
  const id = subCategoryId?.trim() ?? "";
  if (!id || id === "all" || id === "ALL") {
    return null;
  }

  const typeFilter =
    typeId && typeId !== "all" && typeId !== "ALL"
      ? { store: { active: true as const, storeTypeId: typeId } }
      : { store: { active: true as const } };

  const fallbackSlug = parseFallbackSubCategoryId(id);
  if (fallbackSlug) {
    const rows = await prisma.category.findMany({
      where: {
        active: true,
        globalCategoryId: null,
        products: { some: { available: true } },
        ...typeFilter,
      },
      select: { storeId: true, name: true },
    });
    return [
      ...new Set(
        rows
          .filter((row) => slugifyCategoryLabel(row.name) === fallbackSlug)
          .map((row) => row.storeId),
      ),
    ];
  }

  const rows = await prisma.category.findMany({
    where: {
      active: true,
      globalCategoryId: id,
      products: { some: { available: true } },
      ...typeFilter,
    },
    select: { storeId: true },
  });

  return [...new Set(rows.map((row) => row.storeId))];
}

export function productSubCategoryWhere(
  subCategoryId: string | null | undefined,
):
  | { category: { globalCategoryId: string } }
  | { category: { globalCategoryId: null; name: { equals: string; mode: "insensitive" } } }
  | Record<string, never> {
  const id = subCategoryId?.trim() ?? "";
  if (!id || id === "all" || id === "ALL") {
    return {};
  }
  const fallbackSlug = parseFallbackSubCategoryId(id);
  if (fallbackSlug) {
    // Name match is applied after fetch for fallbacks (slug vs display name).
    return { category: { globalCategoryId: null } };
  }
  return { category: { globalCategoryId: id } };
}
