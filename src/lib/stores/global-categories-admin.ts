import "server-only";

import { prisma } from "@/lib/db";
import { ensureGlobalCategoriesReady, resetGlobalCategoriesSeedCache } from "@/lib/stores/global-categories-seed";
import type {
  GlobalCategoryRecord,
  GlobalCategoryWriteInput,
} from "@/lib/stores/global-categories-admin-types";

function slugify(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || `cat-${Date.now().toString(36)}`
  );
}

function serialize(row: {
  id: string;
  storeTypeId: string | null;
  parentId: string | null;
  name: string;
  slug: string;
  icon: string;
  imageUrl: string | null;
  sortOrder: number;
  isOther: boolean;
  active: boolean;
  storeType: { name: string } | null;
  _count: { storeCategories: number };
}): GlobalCategoryRecord {
  return {
    id: row.id,
    storeTypeId: row.storeTypeId,
    storeTypeName: row.storeType?.name ?? null,
    parentId: row.parentId,
    name: row.name,
    slug: row.slug,
    icon: row.icon,
    imageUrl: row.imageUrl,
    sortOrder: row.sortOrder,
    isOther: row.isOther,
    active: row.active,
    linkedCount: row._count.storeCategories,
  };
}

const include = {
  storeType: { select: { name: true } },
  _count: { select: { storeCategories: true } },
} as const;

export async function listAdminGlobalCategories(
  storeTypeId?: string | null,
): Promise<GlobalCategoryRecord[]> {
  await ensureGlobalCategoriesReady();
  const rows = await prisma.globalCategory.findMany({
    where: {
      active: true,
      ...(storeTypeId ? { storeTypeId } : {}),
    },
    include,
    orderBy: [{ storeTypeId: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
  });
  return rows.map(serialize);
}

export async function listGlobalCategoriesForStoreType(
  storeTypeId: string,
): Promise<Array<Pick<GlobalCategoryRecord, "id" | "name" | "icon" | "imageUrl" | "isOther" | "sortOrder">>> {
  await ensureGlobalCategoriesReady();
  if (!storeTypeId) {
    return [];
  }
  const rows = await prisma.globalCategory.findMany({
    where: { storeTypeId, active: true },
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
  return rows;
}

export async function getOtherGlobalCategoryId(storeTypeId: string): Promise<string | null> {
  await ensureGlobalCategoriesReady();
  const row = await prisma.globalCategory.findFirst({
    where: { storeTypeId, isOther: true, active: true },
    select: { id: true },
  });
  return row?.id ?? null;
}

export async function createGlobalCategory(
  input: GlobalCategoryWriteInput,
): Promise<GlobalCategoryRecord> {
  await ensureGlobalCategoriesReady();
  const name = input.name.trim();
  if (!name) {
    throw new Error("Category name is required.");
  }
  if (!input.storeTypeId.trim()) {
    throw new Error("Store type is required.");
  }

  const storeType = await prisma.storeType.findUnique({
    where: { id: input.storeTypeId },
    select: { id: true },
  });
  if (!storeType) {
    throw new Error("Store type not found.");
  }

  let slug = (input.slug?.trim() || slugify(name)).slice(0, 48);
  const clash = await prisma.globalCategory.findFirst({
    where: { storeTypeId: input.storeTypeId, slug },
    select: { id: true, active: true },
  });
  if (clash) {
    if (!clash.active) {
      // Reuse soft-deleted slug row instead of colliding on the unique index.
      const row = await prisma.globalCategory.update({
        where: { id: clash.id },
        data: {
          storeTypeId: input.storeTypeId,
          parentId: input.parentId ?? null,
          name,
          slug,
          icon: input.icon?.trim() || "📦",
          imageUrl: input.imageUrl?.trim() || null,
          sortOrder: input.sortOrder ?? 0,
          isOther: input.isOther === true,
          active: true,
        },
        include,
      });
      resetGlobalCategoriesSeedCache();
      return serialize(row);
    }
    slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  }

  const row = await prisma.globalCategory.create({
    data: {
      storeTypeId: input.storeTypeId,
      parentId: input.parentId ?? null,
      name,
      slug,
      icon: input.icon?.trim() || "📦",
      imageUrl: input.imageUrl?.trim() || null,
      sortOrder: input.sortOrder ?? 0,
      isOther: input.isOther === true,
      active: input.active ?? true,
    },
    include,
  });
  resetGlobalCategoriesSeedCache();
  return serialize(row);
}

export async function updateGlobalCategory(
  id: string,
  input: GlobalCategoryWriteInput,
): Promise<GlobalCategoryRecord> {
  await ensureGlobalCategoriesReady();
  const existing = await prisma.globalCategory.findUnique({
    where: { id },
    select: { id: true, storeTypeId: true, slug: true, active: true },
  });
  if (!existing || !existing.active) {
    throw new Error("Category not found.");
  }

  const name = input.name.trim();
  if (!name) {
    throw new Error("Category name is required.");
  }
  if (!input.storeTypeId.trim()) {
    throw new Error("Store type is required.");
  }

  // Keep the stable slug so the seeder does not recreate a preset duplicate.
  let slug = existing.slug;
  if (input.slug?.trim()) {
    slug = input.slug.trim().slice(0, 48);
    const clash = await prisma.globalCategory.findFirst({
      where: {
        storeTypeId: input.storeTypeId,
        slug,
        NOT: { id },
      },
      select: { id: true },
    });
    if (clash) {
      slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
    }
  }

  const row = await prisma.globalCategory.update({
    where: { id },
    data: {
      storeTypeId: input.storeTypeId,
      parentId: input.parentId ?? null,
      name,
      slug,
      icon: input.icon?.trim() || "📦",
      imageUrl: input.imageUrl?.trim() || null,
      sortOrder: input.sortOrder ?? 0,
      isOther: input.isOther === true,
      active: input.active ?? true,
    },
    include,
  });
  resetGlobalCategoriesSeedCache();
  return serialize(row);
}

export async function deleteGlobalCategory(id: string): Promise<void> {
  await ensureGlobalCategoriesReady();
  const existing = await prisma.globalCategory.findUnique({
    where: { id },
    select: { id: true, active: true },
  });
  if (!existing || !existing.active) {
    throw new Error("Category not found.");
  }

  // Unlink store categories, then soft-delete so the seeder will not recreate
  // the same preset slug on the next boot.
  await prisma.category.updateMany({
    where: { globalCategoryId: id },
    data: { globalCategoryId: null },
  });
  await prisma.globalCategory.update({
    where: { id },
    data: { active: false },
  });
  resetGlobalCategoriesSeedCache();
}
