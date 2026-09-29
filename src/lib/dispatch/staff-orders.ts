import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

const STALE_MS = 40 * 60 * 1000;
const RECENT_LIMIT = 250;
const SEARCH_LIMIT = 80;

export interface StaffOrderLine {
  name: string;
  quantity: number;
  unitPrice: number;
  status: string;
  storeName: string | null;
}

export interface StaffOrderStore {
  name: string;
  phone: string | null;
}

export interface StaffOrderEvent {
  action: string;
  createdAt: string;
}

export type StaffAttention = "cancel" | "stale" | "open" | "done";

export interface StaffOrderRecord {
  id: string;
  orderNumber: string;
  status: string;
  customerName: string;
  customerPhone: string;
  storeName: string | null;
  stores: StaffOrderStore[];
  driverName: string | null;
  driverPhone: string | null;
  addressText: string;
  fulfillment: string;
  tableLabel: string | null;
  source: string;
  orderType: string;
  deliveryFee: number;
  codAmount: number | null;
  quotedPrice: number | null;
  itemsTotal: number;
  storeNotes: string | null;
  customNotes: string | null;
  cancelReason: string | null;
  items: StaffOrderLine[];
  events: StaffOrderEvent[];
  createdAt: string;
  updatedAt: string;
  attention: StaffAttention;
}

function attentionFor(status: string, updatedAt: Date): StaffAttention {
  if (status === "CANCELED") {
    return "cancel";
  }
  if (status === "DELIVERED") {
    return "done";
  }
  if (Date.now() - updatedAt.getTime() >= STALE_MS) {
    return "stale";
  }
  return "open";
}

function lineTotal(lines: StaffOrderLine[]): number {
  return lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
}

function phoneNeedle(query: string): string {
  const digits = query.replace(/\D/g, "");
  if (digits.length < 7) {
    return "";
  }
  return digits.slice(-9);
}

function searchWhere(query: string): Prisma.OrderWhereInput {
  const term = query.trim();
  const phone = phoneNeedle(term);
  const or: Prisma.OrderWhereInput[] = [
    { orderNumber: { contains: term, mode: "insensitive" } },
    { addressText: { contains: term, mode: "insensitive" } },
    { cancelReason: { contains: term, mode: "insensitive" } },
    { customer: { is: { name: { contains: term, mode: "insensitive" } } } },
    { store: { is: { name: { contains: term, mode: "insensitive" } } } },
    { driver: { is: { user: { is: { name: { contains: term, mode: "insensitive" } } } } } },
    { children: { some: { store: { is: { name: { contains: term, mode: "insensitive" } } } } } },
  ];

  if (phone) {
    or.push(
      { customerPhone: { contains: phone } },
      { customer: { is: { phone: { contains: phone } } } },
      { store: { is: { phone: { contains: phone } } } },
      { driver: { is: { user: { is: { phone: { contains: phone } } } } } },
    );
  }

  return { OR: or };
}

export async function listStaffOrders(query?: string): Promise<StaffOrderRecord[]> {
  const term = query?.trim() ?? "";
  const rows = await prisma.order.findMany({
    where: {
      bundleRole: { not: "CHILD" },
      ...(term ? searchWhere(term) : {}),
    },
    orderBy: { createdAt: "desc" },
    take: term ? SEARCH_LIMIT : RECENT_LIMIT,
    include: {
      customer: { select: { name: true, phone: true } },
      store: { select: { name: true, phone: true } },
      driver: { select: { user: { select: { name: true, phone: true } } } },
      items: {
        select: { name: true, quantity: true, unitPrice: true, status: true },
      },
      children: {
        select: {
          store: { select: { name: true, phone: true } },
          items: {
            select: { name: true, quantity: true, unitPrice: true, status: true },
          },
        },
      },
      auditLogs: {
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { action: true, createdAt: true },
      },
    },
  });

  return rows.map((row) => {
    const ownLines: StaffOrderLine[] = row.items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      status: item.status,
      storeName: row.store?.name ?? null,
    }));
    const childLines: StaffOrderLine[] = row.children.flatMap((child) =>
      child.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        status: item.status,
        storeName: child.store?.name ?? row.store?.name ?? null,
      })),
    );
    const items =
      row.bundleRole === "PARENT" && childLines.length > 0
        ? childLines
        : ownLines.length > 0
          ? ownLines
          : childLines;

    const stores: StaffOrderStore[] = [];
    const seen = new Set<string>();
    const pushStore = (name: string | null | undefined, phone: string | null | undefined): void => {
      const label = name?.trim();
      if (!label || seen.has(label)) {
        return;
      }
      seen.add(label);
      stores.push({ name: label, phone: phone?.trim() || null });
    };
    pushStore(row.store?.name, row.store?.phone);
    for (const child of row.children) {
      pushStore(child.store?.name, child.store?.phone);
    }

    return {
      id: row.id,
      orderNumber: row.orderNumber,
      status: row.status,
      customerName: row.customer?.name?.trim() || row.customerPhone,
      customerPhone: row.customer?.phone || row.customerPhone,
      storeName: stores.map((store) => store.name).join(" · ") || null,
      stores,
      driverName: row.driver?.user.name ?? null,
      driverPhone: row.driver?.user.phone ?? null,
      addressText: row.addressText,
      fulfillment: row.fulfillment,
      tableLabel: row.tableLabel,
      source: row.source,
      orderType: row.orderType,
      deliveryFee: row.deliveryFee,
      codAmount: row.codAmount,
      quotedPrice: row.quotedPrice,
      itemsTotal: lineTotal(items),
      storeNotes: row.storeNotes,
      customNotes: row.customNotes,
      cancelReason: row.cancelReason,
      items,
      events: row.auditLogs.map((event) => ({
        action: event.action,
        createdAt: event.createdAt.toISOString(),
      })),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      attention: attentionFor(row.status, row.updatedAt),
    };
  });
}
