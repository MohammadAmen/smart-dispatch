import "server-only";

import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/db";
import { publishDispatchEvent } from "@/lib/dispatch/events";
import { effectiveProductPrice } from "@/lib/stores/pricing";
import { ensureVendorIntelSchema } from "@/lib/stores/vendor-intel-schema";
import {
  loadVendorOrderRecord,
  type VendorOrderRecord,
} from "@/lib/stores/vendor-orders";

const OPEN_STATUSES = new Set(["PENDING", "PREPARING", "READY_FOR_PICKUP", "ASSIGNED"]);

async function requireDineInOrder(
  storeId: string,
  orderId: string,
): Promise<VendorOrderRecord> {
  await ensureVendorIntelSchema();
  const order = await loadVendorOrderRecord(storeId, orderId);
  if (!order || order.fulfillment !== "DINE_IN") {
    throw new Error("Dine-in order not found.");
  }
  if (order.status === "CANCELED") {
    throw new Error("Order is canceled.");
  }
  return order;
}

async function syncOrderCompletion(storeId: string, orderId: string): Promise<VendorOrderRecord> {
  const order = await loadVendorOrderRecord(storeId, orderId);
  if (!order) {
    throw new Error("Order not found.");
  }
  const allServed = order.items.length > 0 && order.items.every((item) => item.status === "SERVED");
  const nextStatus = allServed
    ? "DELIVERED"
    : order.status === "DELIVERED"
      ? "PREPARING"
      : order.status;

  if (nextStatus !== order.status && (allServed || order.status === "DELIVERED")) {
    await prisma.order.update({
      where: { id: orderId },
      data: { status: nextStatus },
    });
    publishDispatchEvent({ type: "orders.changed" });
  }

  const fresh = await loadVendorOrderRecord(storeId, orderId);
  if (!fresh) {
    throw new Error("Order not found.");
  }
  return fresh;
}

export async function toggleDineInItem(
  storeId: string,
  orderId: string,
  itemId: string,
): Promise<VendorOrderRecord> {
  const order = await requireDineInOrder(storeId, orderId);
  const item = order.items.find((entry) => entry.id === itemId);
  if (!item) {
    throw new Error("Item not found.");
  }
  const next = item.status === "SERVED" ? "PENDING" : "SERVED";
  await prisma.$executeRaw`
    UPDATE order_items
    SET status = ${next}
    WHERE id = ${itemId} AND "orderId" = ${orderId}
  `;
  return syncOrderCompletion(storeId, orderId);
}

export async function serveAllDineInItems(
  storeId: string,
  orderId: string,
): Promise<VendorOrderRecord> {
  const order = await requireDineInOrder(storeId, orderId);
  if (order.items.length === 0) {
    return order;
  }
  await prisma.$executeRaw`
    UPDATE order_items
    SET status = 'SERVED'
    WHERE "orderId" = ${orderId}
  `;
  return syncOrderCompletion(storeId, orderId);
}

export async function addDineInExtraItem(
  storeId: string,
  orderId: string,
  input: { productId?: string | null; name?: string; unitPrice?: number; quantity?: number },
): Promise<VendorOrderRecord> {
  const order = await requireDineInOrder(storeId, orderId);
  if (!OPEN_STATUSES.has(order.status) && order.status !== "DELIVERED") {
    throw new Error("Order cannot accept extra items.");
  }

  const quantity = Math.min(20, Math.max(1, Math.round(input.quantity ?? 1)));
  let name = input.name?.trim() ?? "";
  let unitPrice = Number.isFinite(input.unitPrice) ? Math.max(0, Number(input.unitPrice)) : 0;
  let productId: string | null = input.productId?.trim() || null;

  if (productId) {
    const product = await prisma.product.findFirst({
      where: { id: productId, storeId, available: true },
      select: { id: true, name: true, price: true, hasDiscount: true, discountPrice: true },
    });
    if (!product) {
      throw new Error("Product not found.");
    }
    name = product.name;
    unitPrice = effectiveProductPrice(product);
    productId = product.id;
  }

  if (name.length < 2) {
    throw new Error("Item name is required.");
  }

  const id = randomUUID();
  const itemName = name.slice(0, 120);
  if (productId) {
    await prisma.$executeRaw`
      INSERT INTO order_items (id, "orderId", "productId", quantity, "unitPrice", name, status)
      VALUES (${id}, ${orderId}, ${productId}, ${quantity}, ${unitPrice}, ${itemName}, 'PENDING')
    `;
  } else {
    await prisma.$executeRaw`
      INSERT INTO order_items (id, "orderId", "productId", quantity, "unitPrice", name, status)
      VALUES (${id}, ${orderId}, NULL, ${quantity}, ${unitPrice}, ${itemName}, 'PENDING')
    `;
  }

  const itemsTotal = order.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0) + unitPrice * quantity;
  await prisma.order.update({
    where: { id: orderId },
    data: {
      codAmount: itemsTotal + order.deliveryFee,
      status: order.status === "DELIVERED" ? "PREPARING" : order.status,
    },
  });
  publishDispatchEvent({ type: "orders.changed" });

  const fresh = await loadVendorOrderRecord(storeId, orderId);
  if (!fresh) {
    throw new Error("Order not found.");
  }
  return fresh;
}
