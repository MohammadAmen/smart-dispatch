import "server-only";

import { prisma } from "@/lib/db";
import { pgAddColumn, pgColumnExists, pgCreateIndex, pgDropColumn } from "@/lib/stores/sql-schema";
import { isStoreTypeIcon } from "@/lib/stores/store-type-icon";
import type { StoreTypeRecord, StoreTypeWriteInput } from "@/lib/stores/types";

const DEFAULT_STORE_TYPES: Array<{
  name: string;
  icon: string;
  sortOrder: number;
  legacy: string;
}> = [
  { name: "مطعم", icon: "utensils", sortOrder: 1, legacy: "RESTAURANT" },
  { name: "حلويات", icon: "cake", sortOrder: 2, legacy: "BAKERY" },
  { name: "ورد", icon: "flower", sortOrder: 3, legacy: "FLOWERS" },
  { name: "صيدلية", icon: "pill", sortOrder: 4, legacy: "PHARMACY" },
  { name: "صهريج ماء", icon: "droplets", sortOrder: 5, legacy: "WATER_GAS" },
  { name: "بقالة", icon: "shopping-basket", sortOrder: 6, legacy: "GROCERY" },
  { name: "ورشة", icon: "wrench", sortOrder: 7, legacy: "WORKSHOP" },
  { name: "أخرى", icon: "store", sortOrder: 8, legacy: "OTHER" },
];

let directoryReady: Promise<void> | null = null;

async function migrateStoreDirectorySchema(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS store_types (
      id VARCHAR(191) NOT NULL,
      name VARCHAR(191) NOT NULL,
      icon VARCHAR(191) NOT NULL DEFAULT 'store',
      "sortOrder" INT NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    )
  `);
  await pgCreateIndex("store_types_name_key", "store_types", "name", true);
  await pgCreateIndex("store_types_sortOrder_idx", "store_types", `"sortOrder"`);

  await pgAddColumn("stores", "storeTypeId", "VARCHAR(191) NULL");
  await pgAddColumn("stores", "coverImage", "VARCHAR(2048) NULL");
  await pgAddColumn("stores", "primaryColor", "VARCHAR(32) NULL");
  await pgAddColumn("stores", "secondaryColor", "VARCHAR(32) NULL");
  await pgAddColumn("stores", "welcomeMessage", "VARCHAR(255) NULL");
  await pgAddColumn("stores", "latitude", "DOUBLE PRECISION NULL");
  await pgAddColumn("stores", "longitude", "DOUBLE PRECISION NULL");
  await pgAddColumn("stores", "rating", "DOUBLE PRECISION NOT NULL DEFAULT 0");

  for (const type of DEFAULT_STORE_TYPES) {
    const existing = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM store_types WHERE name = ${type.name} LIMIT 1
    `;
    if (existing[0]) {
      continue;
    }
    const id = crypto.randomUUID();
    await prisma.$executeRaw`
      INSERT INTO store_types (id, name, icon, "sortOrder", "createdAt", "updatedAt")
      VALUES (${id}, ${type.name}, ${type.icon}, ${type.sortOrder}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;
  }

  if (await pgColumnExists("stores", "type")) {
    for (const type of DEFAULT_STORE_TYPES) {
      await prisma.$executeRaw`
        UPDATE stores
        SET "storeTypeId" = (
          SELECT id FROM store_types WHERE name = ${type.name} LIMIT 1
        )
        WHERE type = ${type.legacy} AND ("storeTypeId" IS NULL OR "storeTypeId" = '')
      `;
    }
  }

  const fallback = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM store_types ORDER BY "sortOrder" ASC LIMIT 1
  `;
  const fallbackId = fallback[0]?.id;
  if (fallbackId) {
    await prisma.$executeRaw`
      UPDATE stores
      SET "storeTypeId" = ${fallbackId}
      WHERE "storeTypeId" IS NULL OR "storeTypeId" = ''
    `;
  }

  if (await pgColumnExists("stores", "type")) {
    try {
      await pgDropColumn("stores", "type");
    } catch {
      // Prisma push may drop it later.
    }
  }
}

export async function ensureStoreDirectory(): Promise<void> {
  if (!directoryReady) {
    directoryReady = migrateStoreDirectorySchema().catch((error: unknown) => {
      directoryReady = null;
      throw error;
    });
  }
  await directoryReady;
}

function serializeType(row: {
  id: string;
  name: string;
  icon: string;
  sortOrder: number;
  _count?: { stores: number };
}): StoreTypeRecord {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    sortOrder: row.sortOrder,
    storeCount: row._count?.stores ?? 0,
  };
}

export async function listStoreTypes(): Promise<StoreTypeRecord[]> {
  await ensureStoreDirectory();
  const rows = await prisma.storeType.findMany({
    include: { _count: { select: { stores: true } } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return rows.map(serializeType);
}

export async function createStoreType(input: StoreTypeWriteInput): Promise<StoreTypeRecord> {
  await ensureStoreDirectory();
  const name = input.name.trim();
  if (name.length < 2) {
    throw new Error("Store type name is required.");
  }
  if (!isStoreTypeIcon(input.icon)) {
    throw new Error("Invalid icon.");
  }

  const row = await prisma.storeType.create({
    data: {
      name,
      icon: input.icon,
      sortOrder: input.sortOrder ?? 0,
    },
    include: { _count: { select: { stores: true } } },
  });
  return serializeType(row);
}

export async function updateStoreType(
  id: string,
  input: StoreTypeWriteInput,
): Promise<StoreTypeRecord> {
  await ensureStoreDirectory();
  const name = input.name.trim();
  if (name.length < 2) {
    throw new Error("Store type name is required.");
  }
  if (!isStoreTypeIcon(input.icon)) {
    throw new Error("Invalid icon.");
  }

  const row = await prisma.storeType.update({
    where: { id },
    data: {
      name,
      icon: input.icon,
      sortOrder: input.sortOrder ?? 0,
    },
    include: { _count: { select: { stores: true } } },
  });
  return serializeType(row);
}

export async function deleteStoreType(id: string): Promise<void> {
  await ensureStoreDirectory();
  const existing = await prisma.storeType.findUnique({
    where: { id },
    include: { _count: { select: { stores: true } } },
  });
  if (!existing) {
    throw new Error("Store type not found.");
  }
  if (existing._count.stores > 0) {
    throw new Error("Cannot delete a store type that still has stores.");
  }
  await prisma.storeType.delete({ where: { id } });
}
