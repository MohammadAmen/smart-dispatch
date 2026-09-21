import "server-only";

import type { OrderStatus } from "@/generated/prisma/enums";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { queueAutoAssign } from "@/lib/dispatch/queue-auto-assign";
import { publishDispatchEvent } from "@/lib/dispatch/events";
import { notifyCustomerOrderUpdate } from "@/lib/stores/order-notify";
import { ensureOrderTrackingToken } from "@/lib/stores/order-token";
import { vendorCanCancel, vendorNextStatus } from "@/lib/stores/order-status";
import { uniqueTrackingTokens } from "@/lib/stores/tracking-token";
import { ensureOrderBundleSchema, refreshParentBundleStatus } from "@/lib/stores/order-bundle";
import { ensureCustomOrderSchema } from "@/lib/stores/custom-order-schema";
import { isRealCustomerPhone } from "@/lib/stores/indoor-service";
import { ensureVendorIntelSchema } from "@/lib/stores/vendor-intel-schema";
import type { VendorOrderItemRecord, VendorOrderRecord } from "@/lib/stores/order-types";
import type { VendorOrderFilter } from "@/lib/stores/order-status";
import {
  EMPTY_VENDOR_CHANNEL_COUNTS,
  EMPTY_VENDOR_ORDER_COUNTS,
  VENDOR_ORDERS_PAGE_SIZE,
  type VendorChannelCounts,
  type VendorOrderCounts,
  type VendorOrderSource,
} from "@/lib/stores/vendor-order-query";

export type { VendorOrderRecord } from "@/lib/stores/order-types";

const ORDER_STATUSES: OrderStatus[] = [
  "PENDING",
  "PENDING_QUOTE",
  "QUOTE_ACCEPTED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "ASSIGNED",
  "IN_TRANSIT",
  "DELIVERED",
  "CANCELED",
];

interface OrderRow {
  id: string;
  orderNumber: string;
  status: string;
  customerPhone: string;
  addressText: string;
  createdAt: Date | string;
  cancelReason: string | null;
  customerName: string | null;
  driverName: string | null;
  driverPhone: string | null;
  storePhone: string | null;
  trackingToken: string | null;
  storeNotes: string | null;
  bundleRole: string | null;
  orderType: string | null;
  customImage: string | null;
  customNotes: string | null;
  scheduledDate: Date | string | null;
  quotedPrice: number | null;
  deliveryFee: number | null;
  fulfillment: string | null;
  tableLabel: string | null;
}

function asOrderStatus(value: unknown): OrderStatus {
  if (typeof value === "string" && (ORDER_STATUSES as string[]).includes(value)) {
    return value as OrderStatus;
  }
  return "PENDING";
}

function asIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function serializeVendorOrder(
  row: OrderRow,
  items: VendorOrderItemRecord[],
): VendorOrderRecord {
  return {
    id: row.id,
    orderNumber: row.orderNumber,
    status: asOrderStatus(row.status),
    customerName: row.customerName || row.customerPhone,
    customerPhone: row.customerPhone,
    addressText: row.addressText,
    createdAt: asIso(row.createdAt),
    cancelReason: row.cancelReason,
    driverName: row.driverName,
    driverPhone: row.driverPhone,
    storePhone: row.storePhone,
    trackingToken: row.trackingToken,
    storeNotes: row.storeNotes,
    orderType: row.orderType === "SPECIAL_CUSTOM" ? "SPECIAL_CUSTOM" : "STANDARD",
    customImage: row.customImage,
    customNotes: row.customNotes,
    scheduledDate: row.scheduledDate ? asIso(row.scheduledDate) : null,
    quotedPrice:
      row.quotedPrice != null && Number.isFinite(Number(row.quotedPrice)) ? Number(row.quotedPrice) : null,
    deliveryFee: row.deliveryFee != null && Number.isFinite(Number(row.deliveryFee)) ? Number(row.deliveryFee) : 0,
    fulfillment: row.fulfillment === "DINE_IN" ? "DINE_IN" : "DELIVERY",
    tableLabel: row.tableLabel,
    items,
    total:
      items.length > 0
        ? items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
        : (row.quotedPrice != null && Number.isFinite(Number(row.quotedPrice)) ? Number(row.quotedPrice) : 0) +
          (row.deliveryFee != null && Number.isFinite(Number(row.deliveryFee)) ? Number(row.deliveryFee) : 0),
  };
}

async function attachItems(rows: OrderRow[]): Promise<VendorOrderRecord[]> {
  if (rows.length === 0) {
    return [];
  }

  const orderIds = rows.map((row) => row.id);
  const items = await prisma.$queryRaw<
    {
      id: string;
      orderId: string;
      name: string;
      quantity: number;
      unitPrice: number;
      status: string | null;
    }[]
  >`
    SELECT
      id,
      "orderId",
      name,
      quantity,
      "unitPrice",
      COALESCE(status, 'PENDING') AS status
    FROM order_items
    WHERE "orderId" IN (${Prisma.join(orderIds)})
  `;

  const itemsByOrder = new Map<string, VendorOrderItemRecord[]>();
  for (const item of items) {
    const current = itemsByOrder.get(item.orderId) ?? [];
    current.push({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      status: item.status === "SERVED" ? "SERVED" : "PENDING",
    });
    itemsByOrder.set(item.orderId, current);
  }

  return rows.map((row) => serializeVendorOrder(row, itemsByOrder.get(row.id) ?? []));
}

async function attachPublicBundleItems(rows: OrderRow[]): Promise<VendorOrderRecord[]> {
  const records = await attachItems(rows);
  const parentIds = rows.filter((row) => row.bundleRole === "PARENT").map((row) => row.id);
  if (parentIds.length === 0) {
    return records;
  }

  const children = await prisma.order.findMany({
    where: { parentOrderId: { in: parentIds } },
    select: {
      parentOrderId: true,
      storeNotes: true,
      store: { select: { name: true } },
      items: { select: { id: true, name: true, quantity: true, unitPrice: true } },
    },
    orderBy: { orderNumber: "asc" },
  });

  const itemsByParent = new Map<string, VendorOrderItemRecord[]>();
  const notesByParent = new Map<string, string[]>();
  for (const child of children) {
    if (!child.parentOrderId) {
      continue;
    }
    const list = itemsByParent.get(child.parentOrderId) ?? [];
    for (const item of child.items) {
      list.push({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        status: "PENDING",
        storeName: child.store?.name ?? undefined,
      });
    }
    itemsByParent.set(child.parentOrderId, list);
    if (child.storeNotes) {
      const notes = notesByParent.get(child.parentOrderId) ?? [];
      notes.push([child.store?.name, child.storeNotes].filter(Boolean).join(": "));
      notesByParent.set(child.parentOrderId, notes);
    }
  }

  return records.map((record) => {
    const items = itemsByParent.get(record.id);
    if (!items) {
      return record;
    }
    const notes = notesByParent.get(record.id);
    return {
      ...record,
      items,
      total: items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
      storeNotes: notes?.join(" · ") ?? record.storeNotes,
    };
  });
}

async function loadOrderRow(storeId: string, orderId: string): Promise<OrderRow | null> {
  const rows = await prisma.$queryRaw<OrderRow[]>`
    SELECT
      o.id,
      o."orderNumber",
      CAST(o.status AS TEXT) AS status,
      o."customerPhone",
      o."addressText",
      o."createdAt",
      o."cancelReason",
      o."trackingToken",
      o."storeNotes",
      COALESCE(o."bundleRole", 'SINGLE') AS "bundleRole",
      COALESCE(CAST(o."orderType" AS TEXT), 'STANDARD') AS "orderType",
      o."customImage",
      o."customNotes",
      o."scheduledDate",
      o."quotedPrice",
      o."deliveryFee",
      COALESCE(o."fulfillment", 'DELIVERY') AS fulfillment,
      o."tableLabel",
      u.name AS "customerName",
      du.name AS "driverName",
      du.phone AS "driverPhone",
      s.phone AS "storePhone"
    FROM orders o
    LEFT JOIN users u ON u.id = o."customerId"
    LEFT JOIN drivers d ON d.id = o."driverId"
    LEFT JOIN users du ON du.id = d."userId"
    LEFT JOIN stores s ON s.id = o."storeId"
    WHERE o.id = ${orderId} AND o."storeId" = ${storeId}
      AND COALESCE(o."bundleRole", 'SINGLE') <> 'PARENT'
    LIMIT 1
  `;
  return rows[0] ?? null;
}

function fulfillmentFilter(source: VendorOrderSource): Prisma.Sql {
  if (source === "DINE_IN") {
    return Prisma.sql`AND COALESCE(o."fulfillment", 'DELIVERY') = 'DINE_IN'`;
  }
  if (source === "DELIVERY") {
    return Prisma.sql`AND COALESCE(o."fulfillment", 'DELIVERY') <> 'DINE_IN'`;
  }
  return Prisma.sql``;
}

function statusFilter(status: VendorOrderFilter): Prisma.Sql {
  if (status === "ALL") {
    return Prisma.sql`AND CAST(o.status AS TEXT) <> 'PENDING_QUOTE'`;
  }
  return Prisma.sql`AND CAST(o.status AS TEXT) = ${status}`;
}

const ORDER_SELECT = Prisma.sql`
  o.id,
  o."orderNumber",
  CAST(o.status AS TEXT) AS status,
  o."customerPhone",
  o."addressText",
  o."createdAt",
  o."cancelReason",
  o."trackingToken",
  o."storeNotes",
  COALESCE(o."bundleRole", 'SINGLE') AS "bundleRole",
  COALESCE(CAST(o."orderType" AS TEXT), 'STANDARD') AS "orderType",
  o."customImage",
  o."customNotes",
  o."scheduledDate",
  o."quotedPrice",
  o."deliveryFee",
  COALESCE(o."fulfillment", 'DELIVERY') AS fulfillment,
  o."tableLabel",
  u.name AS "customerName",
  du.name AS "driverName",
  du.phone AS "driverPhone",
  s.phone AS "storePhone"
`;

export interface VendorOrdersPageResult {
  orders: VendorOrderRecord[];
  quotes: VendorOrderRecord[];
  prepAlerts: VendorOrderRecord[];
  total: number;
  page: number;
  pageSize: number;
  counts: VendorOrderCounts;
  channelCounts: VendorChannelCounts;
}

export interface VendorOrderAlertRow {
  id: string;
  status: string;
  fulfillment: "DELIVERY" | "DINE_IN";
  tableLabel: string | null;
  addressText: string;
  orderNumber: string;
}

export async function countVendorOrderStatuses(
  storeId: string,
  source: VendorOrderSource,
): Promise<VendorOrderCounts> {
  await ensureVendorIntelSchema();
  const rows = await prisma.$queryRaw<{ status: string; count: bigint | number }[]>`
    SELECT CAST(o.status AS TEXT) AS status, COUNT(*) AS count
    FROM orders o
    WHERE o."storeId" = ${storeId}
      AND COALESCE(o."bundleRole", 'SINGLE') <> 'PARENT'
      ${fulfillmentFilter(source)}
    GROUP BY o.status
  `;
  const counts = { ...EMPTY_VENDOR_ORDER_COUNTS };
  for (const row of rows) {
    const n = Number(row.count);
    if (row.status === "PENDING_QUOTE") {
      counts.PENDING_QUOTE = n;
    } else if (row.status === "PENDING") {
      counts.PENDING = n;
    } else if (row.status === "PREPARING") {
      counts.PREPARING = n;
    } else if (row.status === "READY_FOR_PICKUP") {
      counts.READY_FOR_PICKUP = n;
    } else if (row.status === "DELIVERED") {
      counts.DELIVERED = n;
    }
    if (row.status !== "PENDING_QUOTE") {
      counts.ALL += n;
    }
  }
  return counts;
}

export async function countVendorOrderChannels(
  storeId: string,
  status: VendorOrderFilter,
): Promise<VendorChannelCounts> {
  await ensureVendorIntelSchema();
  const rows = await prisma.$queryRaw<{ fulfillment: string; count: bigint | number }[]>`
    SELECT COALESCE(o."fulfillment", 'DELIVERY') AS fulfillment, COUNT(*) AS count
    FROM orders o
    WHERE o."storeId" = ${storeId}
      AND COALESCE(o."bundleRole", 'SINGLE') <> 'PARENT'
      ${statusFilter(status)}
    GROUP BY COALESCE(o."fulfillment", 'DELIVERY')
  `;
  const counts = { ...EMPTY_VENDOR_CHANNEL_COUNTS };
  for (const row of rows) {
    const n = Number(row.count);
    counts.ALL += n;
    if (row.fulfillment === "DINE_IN") {
      counts.DINE_IN += n;
    } else {
      counts.DELIVERY += n;
    }
  }
  return counts;
}

export async function listStoreOrdersPage(input: {
  storeId: string;
  page: number;
  status: VendorOrderFilter;
  orderSource: VendorOrderSource;
}): Promise<VendorOrdersPageResult> {
  await ensureOrderBundleSchema();
  await ensureCustomOrderSchema();
  await ensureVendorIntelSchema();

  const page = Math.max(1, input.page);
  const offset = (page - 1) * VENDOR_ORDERS_PAGE_SIZE;
  const source = input.orderSource;
  const status = input.status;

  const [rows, totalRows, counts, channelCounts, quoteRows, alertRows] = await Promise.all([
    prisma.$queryRaw<OrderRow[]>`
      SELECT ${ORDER_SELECT}
      FROM orders o
      LEFT JOIN users u ON u.id = o."customerId"
      LEFT JOIN drivers d ON d.id = o."driverId"
      LEFT JOIN users du ON du.id = d."userId"
      LEFT JOIN stores s ON s.id = o."storeId"
      WHERE o."storeId" = ${input.storeId}
        AND COALESCE(o."bundleRole", 'SINGLE') <> 'PARENT'
        ${fulfillmentFilter(source)}
        ${statusFilter(status)}
      ORDER BY o."createdAt" DESC
      LIMIT ${VENDOR_ORDERS_PAGE_SIZE} OFFSET ${offset}
    `,
    prisma.$queryRaw<{ count: bigint | number }[]>`
      SELECT COUNT(*) AS count
      FROM orders o
      WHERE o."storeId" = ${input.storeId}
        AND COALESCE(o."bundleRole", 'SINGLE') <> 'PARENT'
        ${fulfillmentFilter(source)}
        ${statusFilter(status)}
    `,
    countVendorOrderStatuses(input.storeId, source),
    countVendorOrderChannels(input.storeId, status),
    status === "PENDING_QUOTE"
      ? Promise.resolve([] as OrderRow[])
      : prisma.$queryRaw<OrderRow[]>`
          SELECT ${ORDER_SELECT}
          FROM orders o
          LEFT JOIN users u ON u.id = o."customerId"
          LEFT JOIN drivers d ON d.id = o."driverId"
          LEFT JOIN users du ON du.id = d."userId"
          LEFT JOIN stores s ON s.id = o."storeId"
          WHERE o."storeId" = ${input.storeId}
            AND COALESCE(o."bundleRole", 'SINGLE') <> 'PARENT'
            ${fulfillmentFilter(source)}
            AND CAST(o.status AS TEXT) = 'PENDING_QUOTE'
          ORDER BY o."createdAt" DESC
          LIMIT 8
        `,
    prisma.$queryRaw<OrderRow[]>`
      SELECT ${ORDER_SELECT}
      FROM orders o
      LEFT JOIN users u ON u.id = o."customerId"
      LEFT JOIN drivers d ON d.id = o."driverId"
      LEFT JOIN users du ON du.id = d."userId"
      LEFT JOIN stores s ON s.id = o."storeId"
      WHERE o."storeId" = ${input.storeId}
        AND COALESCE(o."bundleRole", 'SINGLE') <> 'PARENT'
        AND COALESCE(CAST(o."orderType" AS TEXT), 'STANDARD') = 'SPECIAL_CUSTOM'
        AND o."scheduledDate" IS NOT NULL
        AND CAST(o.status AS TEXT) NOT IN ('CANCELED', 'DELIVERED', 'PENDING_QUOTE')
        AND o."scheduledDate" > NOW()
        AND o."scheduledDate" <= NOW() + INTERVAL '3 hours'
      ORDER BY o."scheduledDate" ASC
      LIMIT 8
    `,
  ]);

  const [orders, quotes, prepAlerts] = await Promise.all([
    attachItems(rows),
    attachItems(quoteRows),
    attachItems(alertRows),
  ]);

  const total = Number(totalRows[0]?.count ?? 0);
  const maxPage = Math.max(1, Math.ceil(total / VENDOR_ORDERS_PAGE_SIZE) || 1);
  if (page > maxPage && total > 0) {
    return listStoreOrdersPage({ ...input, page: maxPage });
  }

  return {
    orders,
    quotes,
    prepAlerts,
    total,
    page,
    pageSize: VENDOR_ORDERS_PAGE_SIZE,
    counts,
    channelCounts,
  };
}

export async function listVendorOrderAlerts(storeId: string): Promise<VendorOrderAlertRow[]> {
  await ensureVendorIntelSchema();
  const rows = await prisma.$queryRaw<
    {
      id: string;
      status: string;
      fulfillment: string | null;
      tableLabel: string | null;
      addressText: string;
      orderNumber: string;
    }[]
  >`
    SELECT
      o.id,
      CAST(o.status AS TEXT) AS status,
      COALESCE(o."fulfillment", 'DELIVERY') AS fulfillment,
      o."tableLabel",
      o."addressText",
      o."orderNumber"
    FROM orders o
    WHERE o."storeId" = ${storeId}
      AND COALESCE(o."bundleRole", 'SINGLE') <> 'PARENT'
      AND CAST(o.status AS TEXT) = 'PENDING'
    ORDER BY o."createdAt" DESC
    LIMIT 200
  `;
  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    fulfillment: row.fulfillment === "DINE_IN" ? "DINE_IN" : "DELIVERY",
    tableLabel: row.tableLabel,
    addressText: row.addressText,
    orderNumber: row.orderNumber,
  }));
}

export async function listStoreOrders(storeId: string): Promise<VendorOrderRecord[]> {
  await ensureOrderBundleSchema();
  await ensureCustomOrderSchema();
  await ensureVendorIntelSchema();
  const rows = await prisma.$queryRaw<OrderRow[]>`
    SELECT
      o.id,
      o."orderNumber",
      CAST(o.status AS TEXT) AS status,
      o."customerPhone",
      o."addressText",
      o."createdAt",
      o."cancelReason",
      o."trackingToken",
      o."storeNotes",
      COALESCE(o."bundleRole", 'SINGLE') AS "bundleRole",
      COALESCE(CAST(o."orderType" AS TEXT), 'STANDARD') AS "orderType",
      o."customImage",
      o."customNotes",
      o."scheduledDate",
      o."quotedPrice",
      o."deliveryFee",
      COALESCE(o."fulfillment", 'DELIVERY') AS fulfillment,
      o."tableLabel",
      u.name AS "customerName",
      du.name AS "driverName",
      du.phone AS "driverPhone",
      s.phone AS "storePhone"
    FROM orders o
    LEFT JOIN users u ON u.id = o."customerId"
    LEFT JOIN drivers d ON d.id = o."driverId"
    LEFT JOIN users du ON du.id = d."userId"
    LEFT JOIN stores s ON s.id = o."storeId"
    WHERE o."storeId" = ${storeId}
      AND COALESCE(o."bundleRole", 'SINGLE') <> 'PARENT'
    ORDER BY o."createdAt" DESC
  `;
  return attachItems(rows);
}

export async function getPublicOrdersByTokens(tokens: string[]): Promise<VendorOrderRecord[]> {
  await ensureOrderBundleSchema();
  await ensureCustomOrderSchema();
  await ensureVendorIntelSchema();
  const safeTokens = uniqueTrackingTokens(tokens).slice(0, 40);
  if (safeTokens.length === 0) {
    return [];
  }

  const tokenList = Prisma.join(
    safeTokens.map((token) => Prisma.sql`${token}`),
    ", ",
  );

  const rows = await prisma.$queryRaw<OrderRow[]>`
    SELECT
      o.id,
      o."orderNumber",
      CAST(o.status AS TEXT) AS status,
      o."customerPhone",
      o."addressText",
      o."createdAt",
      o."cancelReason",
      o."trackingToken",
      o."storeNotes",
      COALESCE(o."bundleRole", 'SINGLE') AS "bundleRole",
      COALESCE(CAST(o."orderType" AS TEXT), 'STANDARD') AS "orderType",
      o."customImage",
      o."customNotes",
      o."scheduledDate",
      o."quotedPrice",
      o."deliveryFee",
      COALESCE(o."fulfillment", 'DELIVERY') AS fulfillment,
      o."tableLabel",
      u.name AS "customerName",
      du.name AS "driverName",
      du.phone AS "driverPhone",
      s.phone AS "storePhone"
    FROM orders o
    LEFT JOIN users u ON u.id = o."customerId"
    LEFT JOIN drivers d ON d.id = o."driverId"
    LEFT JOIN users du ON du.id = d."userId"
    LEFT JOIN stores s ON s.id = o."storeId"
    WHERE o."trackingToken" IN (${tokenList})
      AND COALESCE(o."bundleRole", 'SINGLE') <> 'CHILD'
    ORDER BY o."createdAt" DESC
    LIMIT 40
  `;
  return attachPublicBundleItems(rows);
}

export async function loadVendorOrderRecord(
  storeId: string,
  orderId: string,
): Promise<VendorOrderRecord | null> {
  await ensureVendorIntelSchema();
  const row = await loadOrderRow(storeId, orderId);
  if (!row) {
    return null;
  }
  const [record] = await attachItems([row]);
  return record ?? null;
}

export async function advanceVendorOrderStatus(
  storeId: string,
  orderId: string,
): Promise<VendorOrderRecord> {
  const existing = await loadOrderRow(storeId, orderId);
  if (!existing) {
    throw new Error("Order not found.");
  }

  const nextStatus = vendorNextStatus(asOrderStatus(existing.status));
  if (!nextStatus) {
    throw new Error("This order cannot be advanced from the store dashboard.");
  }

  await prisma.$executeRaw`
    UPDATE orders
    SET status = ${nextStatus}
    WHERE id = ${orderId} AND "storeId" = ${storeId}
  `;

  const items = await prisma.orderItem.findMany({
    where: { orderId },
    select: { id: true, name: true, quantity: true, unitPrice: true, status: true },
  });
  const record = serializeVendorOrder(
    { ...existing, status: nextStatus },
    items.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      status: item.status === "SERVED" ? "SERVED" : "PENDING",
    })),
  );

  await prisma.auditLog.create({
    data: {
      orderId,
      action: nextStatus === "PREPARING" ? "ORDER_PREPARING" : "ORDER_READY_FOR_PICKUP",
      details: { from: existing.status, to: nextStatus },
    },
  });

  publishDispatchEvent({ type: "orders.changed" });
  await refreshParentBundleStatus(orderId);

  if (nextStatus === "READY_FOR_PICKUP" && existing.bundleRole !== "CHILD") {
    queueAutoAssign(orderId);
  }

  if (
    nextStatus === "READY_FOR_PICKUP" &&
    existing.bundleRole !== "CHILD" &&
    isRealCustomerPhone(record.customerPhone)
  ) {
    const trackingToken = record.trackingToken ?? (await ensureOrderTrackingToken(record.id));
    void notifyCustomerOrderUpdate({
      phone: record.customerPhone,
      orderNumber: record.orderNumber,
      trackingToken,
      kind: "ready",
    }).catch(() => undefined);
  }

  return record;
}

export async function cancelVendorOrder(
  storeId: string,
  orderId: string,
  reason: string,
): Promise<VendorOrderRecord> {
  const trimmedReason = reason.trim();
  if (trimmedReason.length < 3) {
    throw new Error("A cancellation reason is required.");
  }

  const existing = await loadOrderRow(storeId, orderId);
  if (!existing) {
    throw new Error("Order not found.");
  }

  if (!vendorCanCancel(asOrderStatus(existing.status))) {
    throw new Error("This order can no longer be canceled from the store dashboard.");
  }

  await prisma.$executeRaw`
    UPDATE orders
    SET status = ${"CANCELED"},
        "cancelReason" = ${trimmedReason.slice(0, 500)}
    WHERE id = ${orderId} AND "storeId" = ${storeId}
  `;

  const items = await prisma.orderItem.findMany({
    where: { orderId },
    select: { id: true, name: true, quantity: true, unitPrice: true, status: true },
  });
  const record = serializeVendorOrder(
    { ...existing, status: "CANCELED", cancelReason: trimmedReason.slice(0, 500) },
    items.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      status: item.status === "SERVED" ? "SERVED" : "PENDING",
    })),
  );

  await prisma.auditLog.create({
    data: {
      orderId,
      action: "ORDER_CANCELED",
      details: { from: existing.status, to: "CANCELED", reason: trimmedReason },
    },
  });

  publishDispatchEvent({ type: "orders.changed" });
  await refreshParentBundleStatus(orderId);

  if (existing.bundleRole !== "CHILD") {
    const trackingToken = record.trackingToken ?? (await ensureOrderTrackingToken(record.id));
    void notifyCustomerOrderUpdate({
      phone: record.customerPhone,
      orderNumber: record.orderNumber,
      trackingToken,
      kind: "canceled",
      reason: trimmedReason,
    }).catch(() => undefined);
  }

  return record;
}
