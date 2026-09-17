import "server-only";

import { prisma } from "@/lib/db";
import { pgAddColumn, pgCreateIndex, pgDropNotNull } from "@/lib/stores/sql-schema";

let storiesReady: Promise<void> | null = null;

async function migrateStoreStoriesSchema(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS store_stories (
      id VARCHAR(191) NOT NULL,
      "storeId" VARCHAR(191) NULL,
      title VARCHAR(191) NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      "videoUrl" VARCHAR(2048) NOT NULL,
      "mediaType" VARCHAR(16) NOT NULL DEFAULT 'VIDEO',
      duration INT NOT NULL,
      "isOrderable" BOOLEAN NOT NULL DEFAULT false,
      "isAdminAd" BOOLEAN NOT NULL DEFAULT false,
      "actionType" VARCHAR(32) NOT NULL DEFAULT 'ORDER_PRODUCT',
      "contactNumber" VARCHAR(191) NULL,
      "externalLink" VARCHAR(2048) NULL,
      "productId" VARCHAR(191) NULL,
      price DOUBLE PRECISION NULL,
      "viewsCount" INT NOT NULL DEFAULT 0,
      "likesCount" INT NOT NULL DEFAULT 0,
      "expiresAt" TIMESTAMP(3) NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    )
  `);
  await pgCreateIndex("store_stories_storeId_expiresAt_idx", "store_stories", `"storeId", "expiresAt"`);
  await pgCreateIndex("store_stories_expiresAt_createdAt_idx", "store_stories", `"expiresAt", "createdAt"`);
  await pgCreateIndex("store_stories_productId_idx", "store_stories", `"productId"`);
  await pgCreateIndex("store_stories_isAdminAd_expiresAt_idx", "store_stories", `"isAdminAd", "expiresAt"`);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS story_likes (
      id VARCHAR(191) NOT NULL,
      "storyId" VARCHAR(191) NOT NULL,
      "userId" VARCHAR(191) NULL,
      "guestKey" VARCHAR(191) NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    )
  `);
  await pgCreateIndex("story_likes_storyId_guestKey_key", "story_likes", `"storyId", "guestKey"`, true);
  await pgCreateIndex("story_likes_storyId_idx", "story_likes", `"storyId"`);
  await pgCreateIndex("story_likes_userId_idx", "story_likes", `"userId"`);

  try {
    await pgDropNotNull("store_stories", "storeId");
  } catch {
    // Already nullable.
  }

  await pgAddColumn("store_stories", "mediaType", "VARCHAR(16) NOT NULL DEFAULT 'VIDEO'");
  await pgAddColumn("store_stories", "isAdminAd", "BOOLEAN NOT NULL DEFAULT false");
  await pgAddColumn("store_stories", "actionType", "VARCHAR(32) NOT NULL DEFAULT 'ORDER_PRODUCT'");
  await pgAddColumn("store_stories", "contactNumber", "VARCHAR(191) NULL");
  await pgAddColumn("store_stories", "externalLink", "VARCHAR(2048) NULL");
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
