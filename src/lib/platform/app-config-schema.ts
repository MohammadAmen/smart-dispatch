import "server-only";

import { prisma } from "@/lib/db";
import { pgAddColumn } from "@/lib/stores/sql-schema";

let ready: Promise<void> | null = null;

async function migrateAppConfigSchema(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS app_config (
      id VARCHAR(64) NOT NULL,
      "menuHeaderBackgroundUrl" VARCHAR(2048) NULL,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    )
  `);
  await pgAddColumn("app_config", "menuHeaderBackgroundUrl", "VARCHAR(2048) NULL");
  await prisma.$executeRawUnsafe(`
    INSERT INTO app_config (id, "menuHeaderBackgroundUrl", "updatedAt")
    VALUES ('default', NULL, CURRENT_TIMESTAMP)
    ON CONFLICT (id) DO NOTHING
  `);
}

export async function ensureAppConfigSchema(): Promise<void> {
  if (!ready) {
    ready = migrateAppConfigSchema().catch((error: unknown) => {
      ready = null;
      throw error;
    });
  }
  await ready;
}
