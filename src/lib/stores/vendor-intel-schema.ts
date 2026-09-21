import "server-only";

import { prisma } from "@/lib/db";
import { pgAddColumn, pgCreateIndex, pgDropNotNull } from "@/lib/stores/sql-schema";

let intelReady: Promise<void> | null = null;

async function migrateVendorIntelSchema(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS search_logs (
      id VARCHAR(191) NOT NULL,
      query VARCHAR(191) NOT NULL,
      "storeId" VARCHAR(191) NULL,
      city VARCHAR(191) NULL,
      results INT NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    )
  `);
  await pgCreateIndex("search_logs_storeId_createdAt_idx", "search_logs", `"storeId", "createdAt"`);
  await pgCreateIndex("search_logs_city_createdAt_idx", "search_logs", `city, "createdAt"`);
  await pgCreateIndex("search_logs_query_createdAt_idx", "search_logs", `query, "createdAt"`);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS cart_intents (
      id VARCHAR(191) NOT NULL,
      "storeId" VARCHAR(191) NOT NULL,
      "productId" VARCHAR(191) NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    )
  `);
  await pgCreateIndex(
    "cart_intents_store_product_created_idx",
    "cart_intents",
    `"storeId", "productId", "createdAt"`,
  );

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS store_tables (
      id VARCHAR(191) NOT NULL,
      "storeId" VARCHAR(191) NOT NULL,
      name VARCHAR(191) NOT NULL,
      capacity INT NOT NULL DEFAULT 2,
      token VARCHAR(191) NOT NULL,
      kind VARCHAR(32) NOT NULL DEFAULT 'TABLE',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    )
  `);
  await pgCreateIndex("store_tables_token_key", "store_tables", "token", true);
  await pgCreateIndex("store_tables_storeId_idx", "store_tables", `"storeId"`);

  await pgAddColumn("stores", "receiptFooterNote", "VARCHAR(255) NULL");
  await pgAddColumn("stores", "primaryColor", "VARCHAR(32) NULL");
  await pgAddColumn("stores", "secondaryColor", "VARCHAR(32) NULL");
  await pgAddColumn("stores", "welcomeMessage", "VARCHAR(255) NULL");
  await pgAddColumn("orders", "fulfillment", "VARCHAR(32) NOT NULL DEFAULT 'DELIVERY'");
  await pgAddColumn("orders", "tableId", "VARCHAR(191) NULL");
  await pgAddColumn("orders", "tableLabel", "VARCHAR(64) NULL");
  await pgAddColumn("order_items", "status", "VARCHAR(32) NOT NULL DEFAULT 'PENDING'");
  try {
    await pgDropNotNull("order_items", "productId");
  } catch {
    // Already nullable, or the engine rejected a no-op change.
  }
}

export async function ensureVendorIntelSchema(): Promise<void> {
  if (!intelReady) {
    intelReady = migrateVendorIntelSchema().catch((error: unknown) => {
      intelReady = null;
      throw error;
    });
  }
  await intelReady;
}
