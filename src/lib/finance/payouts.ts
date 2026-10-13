import "server-only";

import { randomBytes } from "node:crypto";

import { prisma } from "@/lib/db";
import { ensureFinanceSchema } from "@/lib/finance/ensure-schema";
import { money } from "@/lib/finance/types";

export interface StorePayoutDueRow {
  storeId: string
  storeName: string
  storePhone: string | null
  storeAddress: string | null
  storeCity: string | null
  pendingCount: number
  pendingGross: number
  pendingCommission: number
  pendingNet: number
  oldestAt: string | null
  newestAt: string | null
}

export interface StorePayoutLineView {
  id: string
  orderFinancialId: string
  orderId: string
  orderNumber: string
  itemsSubtotal: number
  commissionPercentage: number
  commissionAmount: number
  storeNetAmount: number
  orderCreatedAt: string
}

export interface StorePayoutSettlementView {
  id: string
  invoiceNumber: string
  storeId: string
  storeName: string
  storePhone: string | null
  storeAddress: string | null
  storeCity: string | null
  periodFrom: string
  periodTo: string
  orderCount: number
  grossSales: number
  commissionTotal: number
  netPayable: number
  note: string | null
  settledAt: string
  settledById: string | null
  lines: StorePayoutLineView[]
}

function invoiceNumber(): string {
  const stamp = new Date()
    .toISOString()
    .slice(0, 10)
    .replaceAll("-", "");
  const suffix = randomBytes(3).toString("hex").toUpperCase();
  return `PAY-${stamp}-${suffix}`;
}

/** Pending store nets (delivered financials not yet settled to the merchant). */
export async function listStorePayoutDues(): Promise<StorePayoutDueRow[]> {
  await ensureFinanceSchema();
  // Platform receivables: commission owed by stores on delivered orders.
  const delivered = await prisma.orderFinancial.findMany({
    where: {
      storeId: { not: null },
      storePayoutSettledAt: null,
      commissionAmount: { gt: 0 },
      order: { status: "DELIVERED" },
    },
    select: {
      storeId: true,
      itemsSubtotal: true,
      commissionAmount: true,
      storeNetAmount: true,
      lockedAt: true,
      order: { select: { createdAt: true } },
    },
  });

  const storeIds = [...new Set(delivered.map((row) => row.storeId).filter(Boolean))] as string[];
  if (storeIds.length === 0) {
    return [];
  }

  const stores = await prisma.store.findMany({
    where: { id: { in: storeIds } },
    select: { id: true, name: true, phone: true, address: true, city: true },
  });
  const storeMap = new Map(stores.map((store) => [store.id, store]));

  const buckets = new Map<
    string,
    {
      pendingCount: number
      pendingGross: number
      pendingCommission: number
      pendingNet: number
      oldestAt: Date | null
      newestAt: Date | null
    }
  >();

  for (const row of delivered) {
    if (!row.storeId) {
      continue;
    }
    const bucket = buckets.get(row.storeId) ?? {
      pendingCount: 0,
      pendingGross: 0,
      pendingCommission: 0,
      pendingNet: 0,
      oldestAt: null,
      newestAt: null,
    };
    bucket.pendingCount += 1;
    bucket.pendingGross = money(bucket.pendingGross + row.itemsSubtotal);
    bucket.pendingCommission = money(bucket.pendingCommission + row.commissionAmount);
    bucket.pendingNet = money(bucket.pendingNet + row.storeNetAmount);
    const at = row.order.createdAt;
    if (!bucket.oldestAt || at < bucket.oldestAt) {
      bucket.oldestAt = at;
    }
    if (!bucket.newestAt || at > bucket.newestAt) {
      bucket.newestAt = at;
    }
    buckets.set(row.storeId, bucket);
  }

  return [...buckets.entries()]
    .map(([storeId, bucket]) => {
      const store = storeMap.get(storeId);
      return {
        storeId,
        storeName: store?.name ?? storeId,
        storePhone: store?.phone ?? null,
        storeAddress: store?.address ?? null,
        storeCity: store?.city ?? null,
        pendingCount: bucket.pendingCount,
        pendingGross: bucket.pendingGross,
        pendingCommission: bucket.pendingCommission,
        pendingNet: bucket.pendingNet,
        oldestAt: bucket.oldestAt?.toISOString() ?? null,
        newestAt: bucket.newestAt?.toISOString() ?? null,
      };
    })
    .sort((a, b) => b.pendingCommission - a.pendingCommission);
}

export async function listPendingFinancialsForStore(
  storeId: string,
): Promise<StorePayoutLineView[]> {
  await ensureFinanceSchema();
  const rows = await prisma.orderFinancial.findMany({
    where: {
      storeId,
      storePayoutSettledAt: null,
      commissionAmount: { gt: 0 },
      order: { status: "DELIVERED" },
    },
    select: {
      id: true,
      orderId: true,
      itemsSubtotal: true,
      commissionPercentage: true,
      commissionAmount: true,
      storeNetAmount: true,
      order: { select: { orderNumber: true, createdAt: true } },
    },
    orderBy: { lockedAt: "asc" },
  });

  return rows.map((row) => ({
    id: row.id,
    orderFinancialId: row.id,
    orderId: row.orderId,
    orderNumber: row.order.orderNumber,
    itemsSubtotal: money(row.itemsSubtotal),
    commissionPercentage: money(row.commissionPercentage),
    commissionAmount: money(row.commissionAmount),
    storeNetAmount: money(row.storeNetAmount),
    orderCreatedAt: row.order.createdAt.toISOString(),
  }));
}

export async function settleStorePayout(input: {
  storeId: string
  note?: string | null
  settledById?: string | null
  financialIds?: string[]
}): Promise<StorePayoutSettlementView> {
  await ensureFinanceSchema();

  const pending = await prisma.orderFinancial.findMany({
    where: {
      storeId: input.storeId,
      storePayoutSettledAt: null,
      commissionAmount: { gt: 0 },
      order: { status: "DELIVERED" },
      ...(input.financialIds?.length ? { id: { in: input.financialIds } } : {}),
    },
    select: {
      id: true,
      orderId: true,
      itemsSubtotal: true,
      commissionPercentage: true,
      commissionAmount: true,
      storeNetAmount: true,
      order: { select: { orderNumber: true, createdAt: true } },
    },
    orderBy: { lockedAt: "asc" },
  });

  if (pending.length === 0) {
    throw new Error("no-pending-payouts");
  }

  const store = await prisma.store.findUnique({
    where: { id: input.storeId },
    select: { id: true, name: true, phone: true, address: true, city: true },
  });
  if (!store) {
    throw new Error("store-not-found");
  }

  const periodFrom = pending.reduce(
    (min, row) => (row.order.createdAt < min ? row.order.createdAt : min),
    pending[0].order.createdAt,
  );
  const periodTo = pending.reduce(
    (max, row) => (row.order.createdAt > max ? row.order.createdAt : max),
    pending[0].order.createdAt,
  );
  const grossSales = money(pending.reduce((sum, row) => sum + row.itemsSubtotal, 0));
  const commissionTotal = money(pending.reduce((sum, row) => sum + row.commissionAmount, 0));
  const netPayable = money(pending.reduce((sum, row) => sum + row.storeNetAmount, 0));
  const settledAt = new Date();
  const number = invoiceNumber();

  const settlement = await prisma.$transaction(async (tx) => {
    const created = await tx.storePayoutSettlement.create({
      data: {
        invoiceNumber: number,
        storeId: store.id,
        periodFrom,
        periodTo,
        orderCount: pending.length,
        grossSales,
        commissionTotal,
        netPayable,
        note: input.note?.trim().slice(0, 500) || null,
        settledAt,
        settledById: input.settledById ?? null,
        lines: {
          create: pending.map((row) => ({
            orderFinancialId: row.id,
            orderId: row.orderId,
            orderNumber: row.order.orderNumber,
            itemsSubtotal: money(row.itemsSubtotal),
            commissionPercentage: money(row.commissionPercentage),
            commissionAmount: money(row.commissionAmount),
            storeNetAmount: money(row.storeNetAmount),
            orderCreatedAt: row.order.createdAt,
          })),
        },
      },
    });

    await tx.orderFinancial.updateMany({
      where: { id: { in: pending.map((row) => row.id) } },
      data: {
        storePayoutSettlementId: created.id,
        storePayoutSettledAt: settledAt,
      },
    });

    await tx.auditLog.create({
      data: {
        orderId: pending[0].orderId,
        userId: input.settledById ?? null,
        action: "STORE_PAYOUT_SETTLED",
        details: {
          settlementId: created.id,
          invoiceNumber: number,
          storeId: store.id,
          orderCount: pending.length,
          netPayable,
        },
      },
    });

    return created;
  });

  return getStorePayoutSettlement(settlement.id);
}

export async function getStorePayoutSettlement(
  settlementId: string,
): Promise<StorePayoutSettlementView> {
  await ensureFinanceSchema();
  const row = await prisma.storePayoutSettlement.findUnique({
    where: { id: settlementId },
    include: {
      store: { select: { name: true, phone: true, address: true, city: true } },
      lines: { orderBy: { orderCreatedAt: "asc" } },
    },
  });
  if (!row) {
    throw new Error("settlement-not-found");
  }
  return {
    id: row.id,
    invoiceNumber: row.invoiceNumber,
    storeId: row.storeId,
    storeName: row.store.name,
    storePhone: row.store.phone,
    storeAddress: row.store.address,
    storeCity: row.store.city,
    periodFrom: row.periodFrom.toISOString(),
    periodTo: row.periodTo.toISOString(),
    orderCount: row.orderCount,
    grossSales: money(row.grossSales),
    commissionTotal: money(row.commissionTotal),
    netPayable: money(row.netPayable),
    note: row.note,
    settledAt: row.settledAt.toISOString(),
    settledById: row.settledById,
    lines: row.lines.map((line) => ({
      id: line.id,
      orderFinancialId: line.orderFinancialId,
      orderId: line.orderId,
      orderNumber: line.orderNumber,
      itemsSubtotal: money(line.itemsSubtotal),
      commissionPercentage: money(line.commissionPercentage),
      commissionAmount: money(line.commissionAmount),
      storeNetAmount: money(line.storeNetAmount),
      orderCreatedAt: line.orderCreatedAt.toISOString(),
    })),
  };
}

export async function listStorePayoutSettlements(options?: {
  storeId?: string
  take?: number
}): Promise<StorePayoutSettlementView[]> {
  await ensureFinanceSchema();
  const rows = await prisma.storePayoutSettlement.findMany({
    where: options?.storeId ? { storeId: options.storeId } : undefined,
    include: {
      store: { select: { name: true, phone: true, address: true, city: true } },
      lines: { orderBy: { orderCreatedAt: "asc" } },
    },
    orderBy: { settledAt: "desc" },
    take: options?.take ?? 40,
  });

  return rows.map((row) => ({
    id: row.id,
    invoiceNumber: row.invoiceNumber,
    storeId: row.storeId,
    storeName: row.store.name,
    storePhone: row.store.phone,
    storeAddress: row.store.address,
    storeCity: row.store.city,
    periodFrom: row.periodFrom.toISOString(),
    periodTo: row.periodTo.toISOString(),
    orderCount: row.orderCount,
    grossSales: money(row.grossSales),
    commissionTotal: money(row.commissionTotal),
    netPayable: money(row.netPayable),
    note: row.note,
    settledAt: row.settledAt.toISOString(),
    settledById: row.settledById,
    lines: row.lines.map((line) => ({
      id: line.id,
      orderFinancialId: line.orderFinancialId,
      orderId: line.orderId,
      orderNumber: line.orderNumber,
      itemsSubtotal: money(line.itemsSubtotal),
      commissionPercentage: money(line.commissionPercentage),
      commissionAmount: money(line.commissionAmount),
      storeNetAmount: money(line.storeNetAmount),
      orderCreatedAt: line.orderCreatedAt.toISOString(),
    })),
  }));
}

export async function getVendorPayoutSummary(storeId: string): Promise<{
  pending: StorePayoutDueRow | null
  pendingLines: StorePayoutLineView[]
  settlements: StorePayoutSettlementView[]
}> {
  const [dues, pendingLines, settlements] = await Promise.all([
    listStorePayoutDues(),
    listPendingFinancialsForStore(storeId),
    listStorePayoutSettlements({ storeId, take: 20 }),
  ]);
  return {
    pending: dues.find((row) => row.storeId === storeId) ?? null,
    pendingLines,
    settlements,
  };
}
