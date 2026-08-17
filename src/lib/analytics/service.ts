import "server-only";

import { prisma } from "@/lib/db";
import { bootstrapDispatchData } from "@/lib/dispatch/bootstrap";
import { publishDispatchEvent } from "@/lib/dispatch/events";
import { liveOrders } from "@/lib/live-map";
import { codAmountFor, ratingFor } from "@/lib/analytics/cod";
import type {
  AnalyticsPayload,
  CashPendingRow,
  DriverLeaderboardRow,
  PeakHourPoint,
  SettleCashResponse,
  TrendPoint,
} from "@/lib/analytics/types";

const DAY_MS = 86_400_000;
const HISTORY_FLAG = "SD-A-";

let historyLock: Promise<void> | null = null;

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function money(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  return Math.round(value * 100) / 100;
}

function minutesBetween(from: Date, to: Date): number {
  return Math.max(1, Math.round((to.getTime() - from.getTime()) / 60_000));
}

async function backfillCodAmounts(): Promise<void> {
  const rows = await prisma.order.findMany({
    where: { codAmount: null },
    select: { id: true, orderNumber: true },
  });

  for (const row of rows) {
    await prisma.order.update({
      where: { id: row.id },
      data: { codAmount: codAmountFor(row.orderNumber) },
    });
  }
}

async function seedHistoryIfNeeded(): Promise<void> {
  const existing = await prisma.order.count({
    where: { orderNumber: { startsWith: HISTORY_FLAG } },
  });
  if (existing >= 28) {
    return;
  }

  const drivers = await prisma.driver.findMany({
    include: { user: { select: { name: true } } },
  });
  if (drivers.length === 0) {
    return;
  }

  const places = liveOrders.map((order) => ({
    address: order.destination.ar,
    lat: order.destinationPoint[0],
    lng: order.destinationPoint[1],
    pickup: order.driver,
  }));

  const now = Date.now();
  const rows = [];

  for (let dayOffset = 13; dayOffset >= 0; dayOffset -= 1) {
    const dayStart = startOfDay(new Date(now - dayOffset * DAY_MS)).getTime();
    const volume = 3 + ((13 - dayOffset) % 4);

    for (let slot = 0; slot < volume; slot += 1) {
      const hour = 8 + ((slot * 3 + dayOffset) % 12);
      const createdAt = new Date(dayStart + hour * 3_600_000 + slot * 7 * 60_000);
      const durationMin = 16 + ((dayOffset * 5 + slot * 9) % 38);
      const updatedAt = new Date(createdAt.getTime() + durationMin * 60_000);
      const driver = drivers[(dayOffset + slot) % drivers.length];
      const place = places[(dayOffset + slot) % places.length];
      const canceled = slot === 2 && dayOffset % 5 === 0;
      const settled = !canceled && dayOffset >= 4;
      const orderNumber = `${HISTORY_FLAG}${isoDay(createdAt).replaceAll("-", "")}-${pad(slot)}`;

      rows.push({
        orderNumber,
        status: canceled ? ("CANCELED" as const) : ("DELIVERED" as const),
        customerPhone: `+96279${pad(dayOffset)}${pad(slot)}${pad(hour)}`.slice(0, 13),
        addressText: place.address,
        pickupLat: place.pickup[0],
        pickupLng: place.pickup[1],
        deliveryLat: place.lat,
        deliveryLng: place.lng,
        driverId: canceled ? null : driver.id,
        codAmount: codAmountFor(orderNumber),
        cashSettledAt: settled ? updatedAt : null,
        createdAt,
        updatedAt,
      });
    }
  }

  if (rows.length > 0) {
    await prisma.order.createMany({ data: rows, skipDuplicates: true });
  }
}

async function ensureAnalyticsData(): Promise<void> {
  await bootstrapDispatchData();
  await backfillCodAmounts();

  if (!historyLock) {
    historyLock = seedHistoryIfNeeded().catch((error: unknown) => {
      historyLock = null;
      throw error;
    });
  }

  await historyLock;
}

function trendLabel(key: string, weekly: boolean, locale: string): string {
  const date = new Date(`${key}T12:00:00`);
  const tag = locale === "ar" ? "ar-JO" : "en-GB";
  if (weekly) {
    return date.toLocaleDateString(tag, { month: "short", day: "numeric" });
  }

  return date.toLocaleDateString(tag, {
    month: "short",
    day: "numeric",
  });
}

function hourLabel(hour: number, locale: string): string {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  return date.toLocaleTimeString(locale === "ar" ? "ar-JO" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function getAnalyticsPayload(locale: string): Promise<AnalyticsPayload> {
  await ensureAnalyticsData();

  const now = new Date();
  const from = startOfDay(new Date(now.getTime() - 13 * DAY_MS));

  const [orders, drivers] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: from } },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        driverId: true,
        codAmount: true,
        cashSettledAt: true,
        createdAt: true,
        updatedAt: true,
        driver: {
          select: {
            id: true,
            vehicleType: true,
            user: { select: { name: true } },
          },
        },
      },
    }),
    prisma.driver.findMany({
      select: {
        id: true,
        status: true,
        vehicleType: true,
        user: { select: { name: true } },
      },
    }),
  ]);

  const delivered = orders.filter((order) => order.status === "DELIVERED");
  const canceled = orders.filter((order) => order.status === "CANCELED");
  const deliveryMinutes = delivered.map((order) =>
    minutesBetween(order.createdAt, order.updatedAt),
  );

  const onDuty = drivers.filter(
    (driver) => driver.status === "AVAILABLE" || driver.status === "BUSY",
  );
  const busy = drivers.filter((driver) => driver.status === "BUSY");

  const dailyMap = new Map<string, TrendPoint>();
  for (let offset = 13; offset >= 0; offset -= 1) {
    const key = isoDay(new Date(now.getTime() - offset * DAY_MS));
    dailyMap.set(key, {
      key,
      label: trendLabel(key, false, locale),
      revenue: 0,
      orders: 0,
    });
  }

  const weeklyMap = new Map<string, TrendPoint>();
  const peak = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    label: hourLabel(hour, locale),
    orders: 0,
  }));

  for (const order of orders) {
    const dayKey = isoDay(order.createdAt);
    const day = dailyMap.get(dayKey);
    if (day) {
      day.orders += 1;
      if (order.status === "DELIVERED") {
        day.revenue = money(day.revenue + money(order.codAmount));
      }
    }

    const weekStart = startOfDay(
      new Date(order.createdAt.getTime() - order.createdAt.getDay() * DAY_MS),
    );
    const weekKey = isoDay(weekStart);
    const week = weeklyMap.get(weekKey) ?? {
      key: weekKey,
      label: trendLabel(weekKey, true, locale),
      revenue: 0,
      orders: 0,
    };
    week.orders += 1;
    if (order.status === "DELIVERED") {
      week.revenue = money(week.revenue + money(order.codAmount));
    }
    weeklyMap.set(weekKey, week);

    peak[order.createdAt.getHours()].orders += 1;
  }

  const byDriver = new Map<
    string,
    {
      name: string;
      vehicleType: string;
      completed: number;
      cashCollected: number;
      minutes: number[];
      pendingAmount: number;
      pendingCount: number;
      lastDeliveryAt: Date | null;
    }
  >();

  for (const driver of drivers) {
    byDriver.set(driver.id, {
      name: driver.user.name,
      vehicleType: driver.vehicleType,
      completed: 0,
      cashCollected: 0,
      minutes: [],
      pendingAmount: 0,
      pendingCount: 0,
      lastDeliveryAt: null,
    });
  }

  for (const order of delivered) {
    if (!order.driverId) {
      continue;
    }

    const bucket = byDriver.get(order.driverId);
    if (!bucket) {
      continue;
    }

    const amount = money(order.codAmount);
    bucket.completed += 1;
    bucket.minutes.push(minutesBetween(order.createdAt, order.updatedAt));
    if (
      !bucket.lastDeliveryAt ||
      order.updatedAt.getTime() > bucket.lastDeliveryAt.getTime()
    ) {
      bucket.lastDeliveryAt = order.updatedAt;
    }

    if (order.cashSettledAt) {
      bucket.cashCollected = money(bucket.cashCollected + amount);
    } else {
      bucket.pendingAmount = money(bucket.pendingAmount + amount);
      bucket.pendingCount += 1;
    }
  }

  const leaderboard: DriverLeaderboardRow[] = [...byDriver.entries()]
    .map(([driverId, row]) => {
      const avgMinutes =
        row.minutes.length === 0
          ? 0
          : Math.round(
              row.minutes.reduce((sum, value) => sum + value, 0) /
                row.minutes.length,
            );
      return {
        driverId,
        name: row.name,
        vehicleType: row.vehicleType,
        completed: row.completed,
        cashCollected: row.cashCollected,
        avgMinutes,
        rating: ratingFor(row.completed, avgMinutes),
      };
    })
    .sort((left, right) => right.completed - left.completed || right.cashCollected - left.cashCollected);

  const cashPending: CashPendingRow[] = [...byDriver.entries()]
    .filter(([, row]) => row.pendingCount > 0)
    .map(([driverId, row]) => ({
      driverId,
      name: row.name,
      vehicleType: row.vehicleType,
      orderCount: row.pendingCount,
      amount: row.pendingAmount,
      lastDeliveryAt: row.lastDeliveryAt?.toISOString() ?? now.toISOString(),
    }))
    .sort((left, right) => right.amount - left.amount);

  const revenue = money(
    delivered.reduce((sum, order) => sum + money(order.codAmount), 0),
  );
  const cashCollected = money(
    delivered
      .filter((order) => order.cashSettledAt)
      .reduce((sum, order) => sum + money(order.codAmount), 0),
  );

  return {
    ok: true,
    kpis: {
      revenue,
      cashCollected,
      cashPending: money(revenue - cashCollected),
      deliveredCount: delivered.length,
      canceledCount: canceled.length,
      avgDeliveryMinutes:
        deliveryMinutes.length === 0
          ? 0
          : Math.round(
              deliveryMinutes.reduce((sum, value) => sum + value, 0) /
                deliveryMinutes.length,
            ),
      utilizationPct:
        onDuty.length === 0
          ? 0
          : Math.round((busy.length / onDuty.length) * 100),
      onDutyDrivers: onDuty.length,
      busyDrivers: busy.length,
    },
    daily: [...dailyMap.values()],
    weekly: [...weeklyMap.values()].sort((left, right) =>
      left.key.localeCompare(right.key),
    ),
    peakHours: peak as PeakHourPoint[],
    leaderboard,
    cashPending,
  };
}

export async function settleDriverCash(
  driverId: string,
): Promise<SettleCashResponse> {
  await ensureAnalyticsData();

  const pending = await prisma.order.findMany({
    where: {
      driverId,
      status: "DELIVERED",
      cashSettledAt: null,
    },
    select: { id: true, codAmount: true },
  });

  if (pending.length === 0) {
    return { ok: true, driverId, settledCount: 0, settledAmount: 0 };
  }

  const settledAt = new Date();
  const settledAmount = money(
    pending.reduce((sum, order) => sum + money(order.codAmount), 0),
  );

  await prisma.$transaction(async (tx) => {
    await tx.order.updateMany({
      where: { id: { in: pending.map((order) => order.id) } },
      data: { cashSettledAt: settledAt },
    });

    await tx.auditLog.createMany({
      data: pending.map((order) => ({
        orderId: order.id,
        action: "CASH_SETTLED",
        details: {
          driverId,
          amount: money(order.codAmount),
          source: "analytics-reconciliation",
        },
      })),
    });
  });

  publishDispatchEvent({ type: "orders.changed" });

  return {
    ok: true,
    driverId,
    settledCount: pending.length,
    settledAmount,
  };
}
