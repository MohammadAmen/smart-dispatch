import "server-only";

import { prisma } from "@/lib/db";

let storiesReady: Promise<void> | null = null;

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

async function makeStoreIdNullable(): Promise<void> {
  const rows = await prisma.$queryRaw<{ IS_NULLABLE: string }[]>`
    SELECT IS_NULLABLE
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'store_stories'
      AND COLUMN_NAME = 'storeId'
  `;
  if ((rows[0]?.IS_NULLABLE ?? "YES") === "YES") {
    return;
  }
  await prisma.$executeRawUnsafe(`
    ALTER TABLE store_stories MODIFY storeId VARCHAR(191) NULL
  `);
}

async function migrateStoreStoriesSchema(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS store_stories (
      id VARCHAR(191) NOT NULL,
      storeId VARCHAR(191) NULL,
      title VARCHAR(191) NOT NULL,
      description TEXT NOT NULL,
      videoUrl VARCHAR(2048) NOT NULL,
      mediaType VARCHAR(16) NOT NULL DEFAULT 'VIDEO',
      duration INT NOT NULL,
      isOrderable TINYINT(1) NOT NULL DEFAULT 0,
      isAdminAd TINYINT(1) NOT NULL DEFAULT 0,
      actionType VARCHAR(32) NOT NULL DEFAULT 'ORDER_PRODUCT',
      contactNumber VARCHAR(191) NULL,
      externalLink VARCHAR(2048) NULL,
      productId VARCHAR(191) NULL,
      price DOUBLE NULL,
      viewsCount INT NOT NULL DEFAULT 0,
      likesCount INT NOT NULL DEFAULT 0,
      expiresAt DATETIME(3) NOT NULL,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt DATETIME(3) NOT NULL,
      PRIMARY KEY (id),
      KEY store_stories_storeId_expiresAt_idx (storeId, expiresAt),
      KEY store_stories_expiresAt_createdAt_idx (expiresAt, createdAt),
      KEY store_stories_productId_idx (productId),
      KEY store_stories_isAdminAd_expiresAt_idx (isAdminAd, expiresAt)
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS story_likes (
      id VARCHAR(191) NOT NULL,
      storyId VARCHAR(191) NOT NULL,
      userId VARCHAR(191) NULL,
      guestKey VARCHAR(191) NOT NULL,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      UNIQUE KEY story_likes_storyId_guestKey_key (storyId, guestKey),
      KEY story_likes_storyId_idx (storyId),
      KEY story_likes_userId_idx (userId)
    )
  `);

  await makeStoreIdNullable();
  await addColumnIfMissing("store_stories", "mediaType", "`mediaType` VARCHAR(16) NOT NULL DEFAULT 'VIDEO'");
  await addColumnIfMissing("store_stories", "isAdminAd", "`isAdminAd` TINYINT(1) NOT NULL DEFAULT 0");
  await addColumnIfMissing("store_stories", "actionType", "`actionType` VARCHAR(32) NOT NULL DEFAULT 'ORDER_PRODUCT'");
  await addColumnIfMissing("store_stories", "contactNumber", "`contactNumber` VARCHAR(191) NULL");
  await addColumnIfMissing("store_stories", "externalLink", "`externalLink` VARCHAR(2048) NULL");
  await alignStoryEnumColumns();
}

async function columnType(table: string, column: string): Promise<string> {
  const rows = await prisma.$queryRaw<{ DATA_TYPE: string }[]>`
    SELECT DATA_TYPE
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ${table}
      AND COLUMN_NAME = ${column}
  `;
  return String(rows[0]?.DATA_TYPE ?? "").toLowerCase();
}

async function alignStoryEnumColumns(): Promise<void> {
  if ((await columnType("store_stories", "mediaType")) !== "enum") {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE store_stories
      MODIFY mediaType ENUM('VIDEO', 'IMAGE') NOT NULL DEFAULT 'VIDEO'
    `);
  }
  if ((await columnType("store_stories", "actionType")) !== "enum") {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE store_stories
      MODIFY actionType ENUM('ORDER_PRODUCT', 'CONTACT_US', 'EXTERNAL_LINK') NOT NULL DEFAULT 'ORDER_PRODUCT'
    `);
  }
}

export async function ensureStoreStoriesSchema(): Promise<void> {
  if (!storiesReady) {
    storiesReady = migrateStoreStoriesSchema().catch((error: unknown) => {
      storiesReady = null;
      throw error;
    });
  }
  await storiesReady;
}
