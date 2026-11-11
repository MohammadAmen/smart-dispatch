import "server-only";

import { createHash, randomUUID } from "node:crypto";

import { prisma } from "@/lib/db";

const SOFT_WINDOW_MS = 90_000;
const PROCESSING_STALE_MS = 45_000;

export interface PlacedOrderResult {
  orderNumber: string
  trackingToken: string
  deliveryFee: number
}

type LockRow = {
  idempotencyKey: string
  customerId: string
  orderNumber: string
  trackingToken: string
  deliveryFee: number
  fingerprint: string
  status: string
  createdAt: Date
};

let ready: Promise<void> | null = null;

async function migrateOrderPlaceLocks(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS order_place_locks (
      "idempotencyKey" VARCHAR(80) NOT NULL,
      "customerId" VARCHAR(36) NOT NULL,
      "orderNumber" VARCHAR(64) NOT NULL DEFAULT '',
      "trackingToken" VARCHAR(64) NOT NULL DEFAULT '',
      "deliveryFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "fingerprint" VARCHAR(128) NOT NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'PROCESSING',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY ("idempotencyKey")
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS order_place_locks_customer_fingerprint_created_idx
     ON order_place_locks ("customerId", "fingerprint", "createdAt")`,
  );
}

export async function ensureOrderPlaceLocks(): Promise<void> {
  if (!ready) {
    ready = migrateOrderPlaceLocks().catch((error: unknown) => {
      ready = null;
      throw error;
    });
  }
  await ready;
}

export function buildOrderFingerprint(input: {
  customerId: string
  addressText: string
  fulfillment: string
  tableId: string | null
  items: Array<{
    productId: string
    quantity: number
    optionValueIds?: string[]
    note?: string
  }>
}): string {
  const normalizedItems = [...input.items]
    .map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      optionValueIds: [...(item.optionValueIds ?? [])].sort(),
      note: (item.note ?? "").trim(),
    }))
    .sort((a, b) => a.productId.localeCompare(b.productId));

  const payload = JSON.stringify({
    customerId: input.customerId,
    addressText: input.addressText.trim().toLowerCase(),
    fulfillment: input.fulfillment,
    tableId: input.tableId ?? "",
    items: normalizedItems,
  });

  return createHash("sha256").update(payload).digest("hex").slice(0, 48);
}

async function readLock(key: string): Promise<LockRow | null> {
  const rows = await prisma.$queryRaw<LockRow[]>`
    SELECT
      "idempotencyKey",
      "customerId",
      "orderNumber",
      "trackingToken",
      "deliveryFee",
      "fingerprint",
      status,
      "createdAt"
    FROM order_place_locks
    WHERE "idempotencyKey" = ${key}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

function toResult(row: LockRow): PlacedOrderResult | null {
  if (row.status !== "COMPLETED" || !row.orderNumber || !row.trackingToken) {
    return null;
  }
  return {
    orderNumber: row.orderNumber,
    trackingToken: row.trackingToken,
    deliveryFee: row.deliveryFee,
  };
}

async function waitForCompleted(key: string): Promise<PlacedOrderResult | null> {
  const deadline = Date.now() + 8_000;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    const row = await readLock(key);
    if (!row) {
      return null;
    }
    const done = toResult(row);
    if (done) {
      return done;
    }
    if (row.status !== "PROCESSING") {
      return null;
    }
  }
  return null;
}

/** Same cart + customer within the soft window → replay. */
export async function findRecentDuplicatePlacement(
  customerId: string,
  fingerprint: string,
): Promise<PlacedOrderResult | null> {
  await ensureOrderPlaceLocks();
  const since = new Date(Date.now() - SOFT_WINDOW_MS);
  const rows = await prisma.$queryRaw<LockRow[]>`
    SELECT
      "idempotencyKey",
      "customerId",
      "orderNumber",
      "trackingToken",
      "deliveryFee",
      "fingerprint",
      status,
      "createdAt"
    FROM order_place_locks
    WHERE "customerId" = ${customerId}
      AND "fingerprint" = ${fingerprint}
      AND status = 'COMPLETED'
      AND "createdAt" >= ${since}
    ORDER BY "createdAt" DESC
    LIMIT 1
  `;
  const row = rows[0];
  return row ? toResult(row) : null;
}

export type IdempotencyClaim =
  | { kind: "proceed"; key: string }
  | { kind: "replay"; result: PlacedOrderResult }
  | { kind: "busy" };

export async function claimOrderIdempotency(input: {
  key: string | null | undefined
  customerId: string
  fingerprint: string
}): Promise<IdempotencyClaim> {
  await ensureOrderPlaceLocks();
  const key = input.key?.trim();
  if (!key || key.length < 8 || key.length > 80) {
    return { kind: "proceed", key: `auto_${randomUUID().replaceAll("-", "").slice(0, 24)}` };
  }

  const existing = await readLock(key);
  if (existing) {
    const done = toResult(existing);
    if (done) {
      return { kind: "replay", result: done };
    }
    if (
      existing.status === "PROCESSING" &&
      Date.now() - new Date(existing.createdAt).getTime() < PROCESSING_STALE_MS
    ) {
      const waited = await waitForCompleted(key);
      if (waited) {
        return { kind: "replay", result: waited };
      }
      return { kind: "busy" };
    }
    // Stale processing row — reuse the key.
    await prisma.$executeRaw`
      UPDATE order_place_locks
      SET status = 'PROCESSING',
          "orderNumber" = '',
          "trackingToken" = '',
          "deliveryFee" = 0,
          "fingerprint" = ${input.fingerprint},
          "customerId" = ${input.customerId},
          "updatedAt" = CURRENT_TIMESTAMP
      WHERE "idempotencyKey" = ${key}
    `;
    return { kind: "proceed", key };
  }

  try {
    await prisma.$executeRaw`
      INSERT INTO order_place_locks (
        "idempotencyKey",
        "customerId",
        "orderNumber",
        "trackingToken",
        "deliveryFee",
        "fingerprint",
        status,
        "createdAt",
        "updatedAt"
      ) VALUES (
        ${key},
        ${input.customerId},
        '',
        '',
        0,
        ${input.fingerprint},
        'PROCESSING',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
    `;
    return { kind: "proceed", key };
  } catch {
    const raced = await readLock(key);
    const done = raced ? toResult(raced) : null;
    if (done) {
      return { kind: "replay", result: done };
    }
    const waited = await waitForCompleted(key);
    if (waited) {
      return { kind: "replay", result: waited };
    }
    return { kind: "busy" };
  }
}

export async function completeOrderIdempotency(
  key: string,
  result: PlacedOrderResult,
): Promise<void> {
  await ensureOrderPlaceLocks();
  await prisma.$executeRaw`
    UPDATE order_place_locks
    SET status = 'COMPLETED',
        "orderNumber" = ${result.orderNumber},
        "trackingToken" = ${result.trackingToken},
        "deliveryFee" = ${result.deliveryFee},
        "updatedAt" = CURRENT_TIMESTAMP
    WHERE "idempotencyKey" = ${key}
  `;
}

export async function releaseOrderIdempotency(key: string): Promise<void> {
  await ensureOrderPlaceLocks();
  await prisma.$executeRaw`
    DELETE FROM order_place_locks
    WHERE "idempotencyKey" = ${key}
      AND status = 'PROCESSING'
  `;
}
