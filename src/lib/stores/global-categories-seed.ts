import "server-only";

import { prisma } from "@/lib/db";
import { ensureGlobalCategoriesSchema } from "@/lib/stores/global-categories-schema";

export type GlobalSubSeed = {
  name: string;
  slug: string;
  icon: string;
  aliases: string[];
  isOther?: boolean;
};

/** Default unified sub-categories per sector keyword. */
export const GLOBAL_SUBCATEGORY_PRESETS: Array<{
  match: RegExp;
  items: GlobalSubSeed[];
}> = [
  {
    match: /مطعم|restaurant|food|مأكول|مطبخ|كافتير/i,
    items: [
      { name: "وجبات رئيسية", slug: "mains", icon: "🍽️", aliases: ["رئيسي", "وجبات", "مأكولات", "أطباق", "main"] },
      { name: "مشاوي", slug: "grills", icon: "🥩", aliases: ["مشوي", "كباب", "شيش", "grill"] },
      { name: "برغر وساندويش", slug: "burgers", icon: "🍔", aliases: ["برغر", "ساندويش", "شاورما", "burger", "sandwich"] },
      { name: "بيتزا", slug: "pizza", icon: "🍕", aliases: ["بيتزا", "pizza"] },
      { name: "مقبلات", slug: "starters", icon: "🥗", aliases: ["مقبلات", "سلطات", "مشهي", "starter", "salad"] },
      { name: "مشروبات", slug: "drinks", icon: "🥤", aliases: ["مشروب", "عصير", "قهوة", "drink", "juice", "coffee"] },
      { name: "حلويات", slug: "desserts", icon: "🍰", aliases: ["حلويات", "آيس", "dessert", "sweet"] },
      { name: "منتجات أخرى 📦", slug: "other", icon: "📦", aliases: ["أخرى", "other", "misc"], isOther: true },
    ],
  },
  {
    match: /سوبر|بقالة|market|grocery|ماركت|تموين/i,
    items: [
      { name: "خضار وفواكه", slug: "produce", icon: "🍎", aliases: ["خضار", "فواكه", "خضروات", "fruit", "veg"] },
      { name: "ألبان وأجبان", slug: "dairy", icon: "🧀", aliases: ["ألبان", "حليب", "جبن", "لبنة", "dairy", "milk"] },
      { name: "لحوم ودواجن", slug: "meat", icon: "🍗", aliases: ["لحوم", "دجاج", "لحم", "meat", "chicken"] },
      { name: "معلبات", slug: "canned", icon: "🥫", aliases: ["معلبات", "صويا", "تون", "canned"] },
      { name: "مشروبات", slug: "drinks", icon: "🧃", aliases: ["مشروب", "عصير", "ماء", "drink", "water"] },
      { name: "منظفات", slug: "cleaning", icon: "🧼", aliases: ["منظف", "تنظيف", "cleaning"] },
      { name: "منتجات أخرى 📦", slug: "other", icon: "📦", aliases: ["أخرى", "other", "misc"], isOther: true },
    ],
  },
  {
    match: /حلو|حلوي|sweet|dessert|كيك|معجن/i,
    items: [
      { name: "كيك وتورت", slug: "cakes", icon: "🎂", aliases: ["كيك", "تورت", "cake"] },
      { name: "بقلاوة وشرقيات", slug: "oriental", icon: "🥮", aliases: ["بقلاوة", "كنافة", "شرقي"] },
      { name: "آيس كريم", slug: "icecream", icon: "🍦", aliases: ["آيس", "مثلجات", "ice"] },
      { name: "مشروبات", slug: "drinks", icon: "☕", aliases: ["مشروب", "قهوة", "drink", "coffee"] },
      { name: "منتجات أخرى 📦", slug: "other", icon: "📦", aliases: ["أخرى", "other", "misc"], isOther: true },
    ],
  },
  {
    match: /صيدل|pharmacy|دواء|طب/i,
    items: [
      { name: "أدوية", slug: "medicine", icon: "💊", aliases: ["دواء", "أدوية", "medicine"] },
      { name: "عناية شخصية", slug: "care", icon: "🧴", aliases: ["عناية", "شامبو", "care"] },
      { name: "فيتامينات", slug: "vitamins", icon: "🧪", aliases: ["فيتامين", "vitamin"] },
      { name: "منتجات أخرى 📦", slug: "other", icon: "📦", aliases: ["أخرى", "other", "misc"], isOther: true },
    ],
  },
];

const DEFAULT_PRESET: GlobalSubSeed[] = [
  { name: "الأكثر طلباً", slug: "popular", icon: "⭐", aliases: ["مميز", "شائع", "popular", "best"] },
  { name: "عروض", slug: "offers", icon: "🏷️", aliases: ["عرض", "خصم", "offer", "deal"] },
  { name: "منتجات أخرى 📦", slug: "other", icon: "📦", aliases: ["أخرى", "other", "misc", "عام"], isOther: true },
];

export function normalizeCategoryLabel(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function presetsForStoreTypeName(name: string): GlobalSubSeed[] {
  for (const preset of GLOBAL_SUBCATEGORY_PRESETS) {
    if (preset.match.test(name)) {
      return preset.items;
    }
  }
  return DEFAULT_PRESET;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "cat";
}

export { slugify as slugifyCategoryLabel };

/**
 * Seeds unified sub-categories per store type and links existing store
 * categories to the best matching global row (or "other") — never deletes data.
 */
export async function seedAndLinkGlobalCategories(): Promise<void> {
  await ensureGlobalCategoriesSchema();

  const storeTypes = await prisma.storeType.findMany({
    select: { id: true, name: true },
    orderBy: { sortOrder: "asc" },
  });

  for (const storeType of storeTypes) {
    const presets = presetsForStoreTypeName(storeType.name);
    for (let index = 0; index < presets.length; index += 1) {
      const item = presets[index];
      const existing = await prisma.globalCategory.findFirst({
        where: { storeTypeId: storeType.id, slug: item.slug },
        select: { id: true },
      });
      if (existing) {
        await prisma.globalCategory.update({
          where: { id: existing.id },
          data: {
            name: item.name,
            icon: item.icon,
            sortOrder: index,
            isOther: item.isOther === true,
            active: true,
          },
        });
        continue;
      }
      await prisma.globalCategory.create({
        data: {
          storeTypeId: storeType.id,
          name: item.name,
          slug: item.slug,
          icon: item.icon,
          sortOrder: index,
          isOther: item.isOther === true,
          active: true,
        },
      });
    }
  }

  const globals = await prisma.globalCategory.findMany({
    where: { active: true },
    select: {
      id: true,
      storeTypeId: true,
      name: true,
      slug: true,
      isOther: true,
    },
  });

  const byType = new Map<string, typeof globals>();
  for (const row of globals) {
    if (!row.storeTypeId) {
      continue;
    }
    const list = byType.get(row.storeTypeId) ?? [];
    list.push(row);
    byType.set(row.storeTypeId, list);
  }

  const storeCategories = await prisma.category.findMany({
    where: { globalCategoryId: null },
    select: {
      id: true,
      name: true,
      store: { select: { storeTypeId: true } },
    },
  });

  for (const category of storeCategories) {
    const typeId = category.store.storeTypeId;
    if (!typeId) {
      continue;
    }
    const candidates = byType.get(typeId) ?? [];
    if (candidates.length === 0) {
      continue;
    }

    const label = normalizeCategoryLabel(category.name);
    const matched =
      candidates.find((item) => {
        if (normalizeCategoryLabel(item.name) === label) {
          return true;
        }
        const preset = presetsForStoreTypeName(
          storeTypes.find((type) => type.id === typeId)?.name ?? "",
        ).find((entry) => entry.slug === item.slug);
        return (preset?.aliases ?? []).some(
          (alias) => normalizeCategoryLabel(alias) === label || label.includes(normalizeCategoryLabel(alias)),
        );
      }) ?? candidates.find((item) => item.isOther);

    if (!matched) {
      continue;
    }

    await prisma.category.update({
      where: { id: category.id },
      data: { globalCategoryId: matched.id },
    });
  }
}

/** Idempotent ensure + seed used by public APIs. */
let seedReady: Promise<void> | null = null;

export function resetGlobalCategoriesSeedCache(): void {
  seedReady = null;
}

export async function ensureGlobalCategoriesReady(): Promise<void> {
  if (!seedReady) {
    seedReady = seedAndLinkGlobalCategories().catch((error: unknown) => {
      seedReady = null;
      throw error;
    });
  }
  await seedReady;
}

export function fallbackSubCategoryId(name: string): string {
  return `fallback:${slugify(name)}`;
}

export function parseFallbackSubCategoryId(id: string): string | null {
  if (!id.startsWith("fallback:")) {
    return null;
  }
  return id.slice("fallback:".length) || null;
}
