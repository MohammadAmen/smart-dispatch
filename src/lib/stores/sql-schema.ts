import "server-only";

import { prisma } from "@/lib/db";

export async function pgColumnExists(table: string, column: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = ${table}
        AND column_name = ${column}
    ) AS "exists"
  `;
  return Boolean(rows[0]?.exists);
}

export async function pgAddColumn(
  table: string,
  column: string,
  definition: string,
): Promise<void> {
  if (await pgColumnExists(table, column)) {
    return;
  }
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "${column}" ${definition}`,
  );
}

export async function pgCreateIndex(
  name: string,
  table: string,
  columns: string,
  unique = false,
): Promise<void> {
  const kind = unique ? "UNIQUE INDEX" : "INDEX";
  await prisma.$executeRawUnsafe(
    `CREATE ${kind} IF NOT EXISTS "${name}" ON "${table}" (${columns})`,
  );
}

export async function pgDropColumn(table: string, column: string): Promise<void> {
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "${table}" DROP COLUMN IF EXISTS "${column}"`,
  );
}

export async function pgDropNotNull(table: string, column: string): Promise<void> {
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "${table}" ALTER COLUMN "${column}" DROP NOT NULL`,
  );
}
