import "server-only";

import { randomBytes } from "node:crypto";

import { prisma } from "@/lib/db";
import { storeUsesDineInTables } from "@/lib/stores/indoor-service";
import type { StoreTableRecord } from "@/lib/stores/store-table-types";
import { ensureVendorIntelSchema } from "@/lib/stores/vendor-intel-schema";

export type { StoreTableRecord } from "@/lib/stores/store-table-types";

function serializeTable(row: {
  id: string;
  storeId: string;
  name: string;
  capacity: number;
  token: string;
  kind: string;
  createdAt: Date;
}): StoreTableRecord {
  return {
    id: row.id,
    storeId: row.storeId,
    name: row.name,
    capacity: row.capacity,
    token: row.token,
    kind: row.kind === "STAND" ? "STAND" : "TABLE",
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listStoreTables(storeId: string): Promise<StoreTableRecord[]> {
  await ensureVendorIntelSchema();
  const rows = await prisma.storeTable.findMany({
    where: { storeId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(serializeTable);
}

export async function createStoreTable(
  storeId: string,
  input: { name: string; capacity?: number; kind?: "TABLE" | "STAND" },
): Promise<StoreTableRecord> {
  await ensureVendorIntelSchema();
  const name = input.name.trim();
  if (!name) {
    throw new Error("Table name is required.");
  }
  const capacity = Math.min(20, Math.max(1, Math.round(input.capacity ?? 2)));
  const row = await prisma.storeTable.create({
    data: {
      storeId,
      name,
      capacity,
      kind: input.kind === "STAND" ? "STAND" : "TABLE",
      token: randomBytes(6).toString("hex"),
    },
  });
  return serializeTable(row);
}

export async function updateStoreTable(
  storeId: string,
  id: string,
  input: { name: string; capacity?: number },
): Promise<StoreTableRecord> {
  await ensureVendorIntelSchema();
  const existing = await prisma.storeTable.findFirst({
    where: { id, storeId },
    select: { id: true },
  });
  if (!existing) {
    throw new Error("Table not found.");
  }
  const name = input.name.trim();
  if (!name) {
    throw new Error("Table name is required.");
  }
  const row = await prisma.storeTable.update({
    where: { id },
    data: {
      name,
      capacity: Math.min(20, Math.max(1, Math.round(input.capacity ?? 2))),
    },
  });
  return serializeTable(row);
}

export async function deleteStoreTable(storeId: string, id: string): Promise<void> {
  await ensureVendorIntelSchema();
  const existing = await prisma.storeTable.findFirst({
    where: { id, storeId },
    select: { id: true },
  });
  if (!existing) {
    throw new Error("Table not found.");
  }
  await prisma.storeTable.delete({ where: { id } });
}

export async function resolveStoreTable(
  storeId: string,
  token: string,
): Promise<StoreTableRecord | null> {
  await ensureVendorIntelSchema();
  const row = await prisma.storeTable.findFirst({
    where: { storeId, token: token.trim() },
  });
  return row ? serializeTable(row) : null;
}

export function defaultTableKind(storeType: { icon: string; name: string }): "TABLE" | "STAND" {
  return storeUsesDineInTables(storeType) ? "TABLE" : "STAND";
}

export async function resolveDineInFromParams(
  storeId: string,
  search: { dineIn?: string; mode?: string; table?: string },
): Promise<{ tableId: string; tableLabel: string } | null> {
  const token = search.table?.trim();
  if (!token) {
    return null;
  }
  const dineInRequested = search.dineIn === "1" || search.mode === "DINE_IN" || Boolean(token);
  if (!dineInRequested) {
    return null;
  }
  const table = await resolveStoreTable(storeId, token);
  if (!table) {
    return null;
  }
  return { tableId: table.id, tableLabel: table.name };
}
