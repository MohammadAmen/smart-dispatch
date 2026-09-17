import "server-only";

import { prisma } from "@/lib/db";

let optionsReady: Promise<void> | null = null;

async function migrateProductOptionsSchema(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS product_option_groups (
      id VARCHAR(191) NOT NULL,
      productId VARCHAR(191) NOT NULL,
      name VARCHAR(191) NOT NULL,
      type VARCHAR(32) NOT NULL DEFAULT 'SINGLE',
      required TINYINT(1) NOT NULL DEFAULT 0,
      sortOrder INT NOT NULL DEFAULT 0,
      PRIMARY KEY (id),
      KEY product_option_groups_product_sort_idx (productId, sortOrder)
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS product_option_values (
      id VARCHAR(191) NOT NULL,
      groupId VARCHAR(191) NOT NULL,
      name VARCHAR(191) NOT NULL,
      extraPrice DOUBLE NOT NULL DEFAULT 0,
      colorHex VARCHAR(16) NULL,
      imageUrl VARCHAR(2048) NULL,
      sortOrder INT NOT NULL DEFAULT 0,
      PRIMARY KEY (id),
      KEY product_option_values_group_sort_idx (groupId, sortOrder)
    )
  `);
}

export async function ensureProductOptionsSchema(): Promise<void> {
  if (!optionsReady) {
    optionsReady = migrateProductOptionsSchema().catch((error: unknown) => {
      optionsReady = null;
      throw error;
    });
  }
  await optionsReady;
}
