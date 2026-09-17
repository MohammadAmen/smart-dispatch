import "server-only";

import { pgAddColumn } from "@/lib/stores/sql-schema";

let customReady: Promise<void> | null = null;

async function migrateCustomOrderSchema(): Promise<void> {
  await pgAddColumn("orders", "orderType", "VARCHAR(191) NOT NULL DEFAULT 'STANDARD'");
  await pgAddColumn("orders", "customImage", "VARCHAR(2048) NULL");
  await pgAddColumn("orders", "customNotes", "TEXT NULL");
  await pgAddColumn("orders", "scheduledDate", "TIMESTAMP(3) NULL");
  await pgAddColumn("orders", "quotedPrice", "DOUBLE PRECISION NULL");
}

export async function ensureCustomOrderSchema(): Promise<void> {
  if (!customReady) {
    customReady = migrateCustomOrderSchema().catch((error: unknown) => {
      customReady = null;
      throw error;
    });
  }
  await customReady;
}
