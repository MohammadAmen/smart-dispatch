import "server-only";

import { prisma } from "@/lib/db";

let intelReady: Promise<void> | null = null;

async function columnExists(table: string, column: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ count: bigint | number }[]>`
    SELECT COUNT(*) AS count
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ${table}
      AND COLUMN_NAME = ${column}
  `;
  return Number(rows[0]?.count ?? 0) > 0;
}

async function addColumnIfMissing(table: string, column: string, ddl: string): Promise<void> {
  if (await columnExists(table, column)) {
    return;
  }
  await prisma.$executeRawUnsafe(`ALTER TABLE \`${table}\` ADD COLUMN ${ddl}`);
}

async function migrateVendorIntelSchema(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS search_logs (
      id VARCHAR(191) NOT NULL,
      query VARCHAR(191) NOT NULL,
      storeId VARCHAR(191) NULL,
      city VARCHAR(191) NULL,
      results INT NOT NULL DEFAULT 0,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      KEY search_logs_storeId_createdAt_idx (storeId, createdAt),
      KEY search_logs_city_createdAt_idx (city, createdAt),
      KEY search_logs_query_createdAt_idx (query, createdAt)
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS cart_intents (
      id VARCHAR(191) NOT NULL,
      storeId VARCHAR(191) NOT NULL,
      productId VARCHAR(191) NOT NULL,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      KEY cart_intents_store_product_created_idx (storeId, productId, createdAt)
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS store_tables (
      id VARCHAR(191) NOT NULL,
      storeId VARCHAR(191) NOT NULL,
      name VARCHAR(191) NOT NULL,
      capacity INT NOT NULL DEFAULT 2,
      token VARCHAR(191) NOT NULL,
      kind VARCHAR(32) NOT NULL DEFAULT 'TABLE',
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt DATETIME(3) NOT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY store_tables_token_key (token),
      KEY store_tables_storeId_idx (storeId)
    )
  `);

  await addColumnIfMissing("stores", "receiptFooterNote", "`receiptFooterNote` VARCHAR(255) NULL");
  await addColumnIfMissing("orders", "fulfillment", "`fulfillment` VARCHAR(32) NOT NULL DEFAULT 'DELIVERY'");
  await addColumnIfMissing("orders", "tableId", "`tableId` VARCHAR(191) NULL");
  await addColumnIfMissing("orders", "tableLabel", "`tableLabel` VARCHAR(64) NULL");
  await addColumnIfMissing(
    "order_items",
    "status",
    "`status` VARCHAR(32) NOT NULL DEFAULT 'PENDING'",
  );
  try {
    await prisma.$executeRawUnsafe("ALTER TABLE `order_items` MODIFY `productId` VARCHAR(191) NULL");
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
