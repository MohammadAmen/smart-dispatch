import "server-only";

import { prisma } from "@/lib/db";

let customReady: Promise<void> | null = null;

const STATUS_ENUM =
  "ENUM('PENDING','PENDING_QUOTE','QUOTE_ACCEPTED','PREPARING','READY_FOR_PICKUP','ASSIGNED','IN_TRANSIT','DELIVERED','CANCELED') NOT NULL DEFAULT 'PENDING'";

async function columnExists(column: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ count: bigint | number }[]>`
    SELECT COUNT(*) AS count
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = "orders"
      AND COLUMN_NAME = ${column}
  `;
  return Number(rows[0]?.count ?? 0) > 0;
}

async function addColumn(ddl: string, column: string): Promise<void> {
  if (await columnExists(column)) {
    return;
  }
  await prisma.$executeRawUnsafe(`ALTER TABLE \`orders\` ADD COLUMN ${ddl}`);
}

async function migrateCustomOrderSchema(): Promise<void> {
  await addColumn("`orderType` VARCHAR(191) NOT NULL DEFAULT 'STANDARD'", "orderType");
  await addColumn("`customImage` VARCHAR(2048) NULL", "customImage");
  await addColumn("`customNotes` TEXT NULL", "customNotes");
  await addColumn("`scheduledDate` DATETIME(3) NULL", "scheduledDate");
  await addColumn("`quotedPrice` DOUBLE NULL", "quotedPrice");
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE \`orders\` MODIFY COLUMN \`status\` ${STATUS_ENUM}`);
  } catch {
    // Enum already includes the new values.
  }
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
