import "server-only";

import { prisma } from "@/lib/db";
import { ensureVendorIntelSchema } from "@/lib/stores/vendor-intel-schema";
import type {
  HourDemandPoint,
  OfferSuggestion,
  ProductProfitRow,
  RevenuePoint,
  SearchTermStat,
  VendorInsightKpis,
  VendorInsightsDashboard,
  VendorReportSummary,
} from "@/lib/stores/vendor-intel-types";

export type {
  HourDemandPoint,
  OfferSuggestion,
  ProductProfitRow,
  RevenuePoint,
  SearchTermStat,
  VendorInsightKpis,
  VendorInsightsDashboard,
  VendorReportSummary,
} from "@/lib/stores/vendor-intel-types";

interface OrderLine {
  productId: string | null;
  name: string;
  unitPrice: number;
  quantity: number;
}

interface InsightOrder {
  status: string;
  customerPhone: string;
  createdAt: Date;
  deliveryFee?: number | null;
  items: OrderLine[];
}

function startOfMonth(now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function startOfPreviousMonth(now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth() - 1, 1);
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function earlierDate(left: Date, right: Date): Date {
  return left.getTime() <= right.getTime() ? left : right;
}

function orderRevenue(order: { items: Array<{ unitPrice: number; quantity: number }> }): number {
  return order.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}

function growthPercent(current: number, previous: number): number {
  if (previous <= 0) {
    return current > 0 ? 100 : 0;
  }
  return ((current - previous) / previous) * 100;
}

function periodStats(
  orders: InsightOrder[],
  start: Date,
  end: Date | null,
): { revenue: number; completed: number; averageOrder: number } {
  const completed = orders.filter((order) => {
    if (order.status !== "DELIVERED" || order.createdAt < start) {
      return false;
    }
    return end === null || order.createdAt < end;
  });
  const revenue = completed.reduce((sum, order) => sum + orderRevenue(order), 0);
  return {
    revenue,
    completed: completed.length,
    averageOrder: completed.length > 0 ? revenue / completed.length : 0,
  };
}

function computeKpis(
  orders: InsightOrder[],
  monthStart: Date,
  previousStart: Date,
  earlierPhones: Set<string>,
): VendorInsightKpis {
  const current = periodStats(orders, monthStart, null);
  const previous = periodStats(orders, previousStart, monthStart);
  const monthCustomers = new Set(
    orders
      .filter(
        (order) =>
          order.createdAt >= monthStart && order.status !== "CANCELED" && order.customerPhone,
      )
      .map((order) => order.customerPhone),
  );
  const returningCustomers = [...monthCustomers].filter((phone) => earlierPhones.has(phone)).length;
  const newCustomers = monthCustomers.size - returningCustomers;
  const retentionRate = monthCustomers.size > 0 ? (returningCustomers / monthCustomers.size) * 100 : 0;

  return {
    revenue: current.revenue,
    revenuePrev: previous.revenue,
    revenueGrowth: growthPercent(current.revenue, previous.revenue),
    averageOrder: current.averageOrder,
    aovPrev: previous.averageOrder,
    aovGrowth: growthPercent(current.averageOrder, previous.averageOrder),
    completedOrders: current.completed,
    retentionRate,
    newCustomerRate: monthCustomers.size > 0 ? (newCustomers / monthCustomers.size) * 100 : 0,
    returningCustomers,
    newCustomers,
  };
}

function queryInCatalog(query: string, names: string[]): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return false;
  }
  return names.some((name) => {
    const hay = name.trim().toLowerCase();
    return hay.length > 0 && (hay.includes(needle) || needle.includes(hay));
  });
}

async function listEarlierPhones(storeId: string, before: Date): Promise<Set<string>> {
  const rows = await prisma.order.findMany({
    where: {
      storeId,
      createdAt: { lt: before },
      bundleRole: { not: "PARENT" },
      status: { not: "CANCELED" },
    },
    select: { customerPhone: true },
    distinct: ["customerPhone"],
  });
  return new Set(rows.map((row) => row.customerPhone));
}

function topProductRows(orders: InsightOrder[], since: Date): ProductProfitRow[] {
  const totals = new Map<string, { productId: string; name: string; revenue: number; quantity: number }>();
  for (const order of orders) {
    if (order.status !== "DELIVERED" || order.createdAt < since) {
      continue;
    }
    for (const item of order.items) {
      const key = item.productId ?? `name:${item.name.trim().toLowerCase()}`;
      const current = totals.get(key) ?? {
        productId: item.productId ?? key,
        name: item.name,
        revenue: 0,
        quantity: 0,
      };
      current.revenue += item.unitPrice * item.quantity;
      current.quantity += item.quantity;
      totals.set(key, current);
    }
  }

  const ranked = [...totals.values()].sort((left, right) => right.revenue - left.revenue).slice(0, 5);
  const totalRevenue = ranked.reduce((sum, row) => sum + row.revenue, 0);
  return ranked.map((row) => ({
    ...row,
    share: totalRevenue > 0 ? (row.revenue / totalRevenue) * 100 : 0,
  }));
}

function peakHourRows(orders: InsightOrder[], since: Date): HourDemandPoint[] {
  const counts = Array.from({ length: 24 }, () => 0);
  for (const order of orders) {
    if (order.status === "CANCELED" || order.createdAt < since) {
      continue;
    }
    counts[order.createdAt.getHours()] += 1;
  }
  return counts.map((ordersCount, hour) => ({
    hour,
    label: `${String(hour).padStart(2, "0")}:00`,
    orders: ordersCount,
  }));
}

export async function logMenuSearch(input: {
  query: string;
  storeId?: string | null;
  city?: string | null;
  results: number;
}): Promise<void> {
  const query = input.query.trim().slice(0, 80);
  if (query.length < 2) {
    return;
  }
  await ensureVendorIntelSchema();
  await prisma.searchLog.create({
    data: {
      query,
      storeId: input.storeId?.trim() || null,
      city: input.city?.trim() || null,
      results: Math.max(0, input.results),
    },
  });
}

export async function logCartIntent(storeId: string, productId: string): Promise<void> {
  if (!storeId || !productId) {
    return;
  }
  await ensureVendorIntelSchema();
  await prisma.cartIntent.create({
    data: { storeId, productId },
  });
}

export async function listTopSearchTerms(
  storeId: string,
  city: string | null,
): Promise<SearchTermStat[]> {
  await ensureVendorIntelSchema();
  const since = daysAgo(30);
  const [rows, products] = await Promise.all([
    prisma.searchLog.findMany({
      where: {
        createdAt: { gte: since },
        OR: [{ storeId }, ...(city ? [{ city }] : [])],
      },
      select: { query: true },
    }),
    prisma.product.findMany({
      where: { storeId },
      select: { name: true },
    }),
  ]);
  const catalogNames = products.map((product) => product.name);
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = row.query.trim().toLowerCase();
    if (!key) {
      continue;
    }
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 12)
    .map(([query, hits]) => ({
      query,
      hits,
      inCatalog: queryInCatalog(query, catalogNames),
    }));
}

export async function listSmartOfferSuggestions(storeId: string): Promise<OfferSuggestion[]> {
  await ensureVendorIntelSchema();
  const since = daysAgo(30);
  const [intents, items, products] = await Promise.all([
    prisma.cartIntent.groupBy({
      by: ["productId"],
      where: { storeId, createdAt: { gte: since } },
      _count: { productId: true },
    }),
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: {
        order: { storeId, createdAt: { gte: since }, status: { not: "CANCELED" } },
      },
      _sum: { quantity: true },
    }),
    prisma.product.findMany({
      where: { storeId, available: true },
      select: { id: true, name: true, imageUrl: true, price: true, hasDiscount: true },
    }),
  ]);

  const sold = new Map(
    items.flatMap((row) => {
      if (!row.productId) {
        return [];
      }
      return [[row.productId, row._sum?.quantity ?? 0] as const];
    }),
  );
  const productMap = new Map(products.map((product) => [product.id, product]));

  return intents
    .flatMap((row) => {
      const product = productMap.get(row.productId);
      if (!product || product.hasDiscount) {
        return [];
      }
      const cartAdds = row._count.productId;
      const purchases = sold.get(row.productId) ?? 0;
      if (cartAdds < 2 || purchases >= cartAdds) {
        return [];
      }
      return [
        {
          productId: product.id,
          name: product.name,
          imageUrl: product.imageUrl,
          price: product.price,
          cartAdds,
          purchases,
          suggestedDiscount: purchases === 0 ? 15 : 10,
        },
      ];
    })
    .sort((left, right) => right.cartAdds - left.cartAdds - (right.purchases - left.purchases))
    .slice(0, 8);
}

function dayKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function weekKey(value: Date): string {
  const date = new Date(value);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return dayKey(date);
}

export async function loadVendorInsightsDashboard(
  storeId: string,
  city: string | null,
): Promise<VendorInsightsDashboard> {
  await ensureVendorIntelSchema();
  const monthStart = startOfMonth();
  const previousStart = startOfPreviousMonth();
  const since30 = daysAgo(30);
  const fetchStart = earlierDate(previousStart, since30);

  const [searches, suggestions, earlierPhones, orders] = await Promise.all([
    listTopSearchTerms(storeId, city),
    listSmartOfferSuggestions(storeId),
    listEarlierPhones(storeId, monthStart),
    prisma.order.findMany({
      where: {
        storeId,
        createdAt: { gte: fetchStart },
        bundleRole: { not: "PARENT" },
      },
      select: {
        status: true,
        customerPhone: true,
        createdAt: true,
        items: { select: { productId: true, name: true, unitPrice: true, quantity: true } },
      },
    }),
  ]);

  return {
    kpis: computeKpis(orders, monthStart, previousStart, earlierPhones),
    searches,
    suggestions,
    topProducts: topProductRows(orders, since30),
    peakHours: peakHourRows(orders, since30),
  };
}

export async function loadVendorReport(storeId: string): Promise<VendorReportSummary> {
  await ensureVendorIntelSchema();
  const monthStart = startOfMonth();
  const previousStart = startOfPreviousMonth();
  const chartStart = daysAgo(42);
  const fetchStart = earlierDate(previousStart, chartStart);

  const [earlierPhones, orders] = await Promise.all([
    listEarlierPhones(storeId, monthStart),
    prisma.order.findMany({
      where: {
        storeId,
        createdAt: { gte: fetchStart },
        bundleRole: { not: "PARENT" },
      },
      select: {
        status: true,
        customerPhone: true,
        createdAt: true,
        deliveryFee: true,
        items: { select: { unitPrice: true, quantity: true, productId: true, name: true } },
      },
    }),
  ]);

  const kpis = computeKpis(orders, monthStart, previousStart, earlierPhones);
  const monthOrders = orders.filter((order) => order.createdAt >= monthStart);
  const completed = monthOrders.filter((order) => order.status === "DELIVERED");

  const dailyMap = new Map<string, RevenuePoint>();
  const weeklyMap = new Map<string, RevenuePoint>();
  for (let i = 13; i >= 0; i -= 1) {
    const key = dayKey(daysAgo(i));
    dailyMap.set(key, { label: key.slice(5), gained: 0, lost: 0 });
  }
  for (let i = 5; i >= 0; i -= 1) {
    const key = weekKey(daysAgo(i * 7));
    weeklyMap.set(key, { label: key.slice(5), gained: 0, lost: 0 });
  }

  for (const order of orders) {
    const total = orderRevenue(order);
    const daily = dailyMap.get(dayKey(order.createdAt));
    const weekly = weeklyMap.get(weekKey(order.createdAt));
    const lost = order.status === "CANCELED";
    if (daily) {
      if (lost) {
        daily.lost += total;
      } else if (order.status === "DELIVERED") {
        daily.gained += total;
      }
    }
    if (weekly) {
      if (lost) {
        weekly.lost += total;
      } else if (order.status === "DELIVERED") {
        weekly.gained += total;
      }
    }
  }

  return {
    ...kpis,
    daily: [...dailyMap.values()],
    weekly: [...weeklyMap.values()],
    platformValue: {
      monthRevenue: kpis.revenue,
      monthOrders: monthOrders.filter((order) => order.status !== "CANCELED").length,
      deliveryFees: completed.reduce((sum, order) => sum + (order.deliveryFee ?? 0), 0),
    },
  };
}
