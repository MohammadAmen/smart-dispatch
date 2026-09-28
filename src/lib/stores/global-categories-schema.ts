import "server-only";

import { prisma } from "@/lib/db";
import { pgAddColumn, pgCreateIndex } from "@/lib/stores/sql-schema";

let ready: Promise<void> | null = null;

async function migrateGlobalCategoriesSchema(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS global_categories (
      id VARCHAR(191) NOT NULL,
      "storeTypeId" VARCHAR(191) NULL,
      "parentId" VARCHAR(191) NULL,
      name VARCHAR(191) NOT NULL,
      slug VARCHAR(191) NOT NULL,
      icon VARCHAR(64) NOT NULL DEFAULT 'package',
      "imageUrl" VARCHAR(2048) NULL,
      "sortOrder" INT NOT NULL DEFAULT 0,
      "isOther" BOOLEAN NOT NULL DEFAULT false,
      active BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    )
  `);

  await pgCreateIndex(
    "global_categories_storeTypeId_slug_key",
    "global_categories",
    `"storeTypeId", slug`,
    true,
  );
  await pgCreateIndex(
    "global_categories_storeTypeId_sortOrder_idx",
    "global_categories",
    `"storeTypeId", "sortOrder"`,
  );
  await pgCreateIndex("global_categories_parentId_idx", "global_categories", `"parentId"`);

  // Non-destructive extensions on existing store categories table.
  await pgAddColumn("categories", "parentId", "VARCHAR(191) NULL");
  await pgAddColumn("categories", "icon", "VARCHAR(64) NULL");
  await pgAddColumn("categories", "imageUrl", "VARCHAR(2048) NULL");
  await pgAddColumn("categories", "globalCategoryId", "VARCHAR(191) NULL");
  await pgCreateIndex("categories_parentId_idx", "categories", `"parentId"`);
  await pgCreateIndex("categories_globalCategoryId_idx", "categories", `"globalCategoryId"`);
}

export async function ensureGlobalCategoriesSchema(): Promise<void> {
  if (!ready) {
    ready = migrateGlobalCategoriesSchema().catch((error: unknown) => {
      ready = null;
      throw error;
    });
  }
  await ready;
}
