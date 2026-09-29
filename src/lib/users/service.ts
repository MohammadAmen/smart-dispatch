import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import type { DriverStatus, Role } from "@/generated/prisma/enums";
import { DEMO_PASSWORD } from "@/lib/auth/constants";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db";
import { bootstrapDispatchData } from "@/lib/dispatch/bootstrap";
import type {
  ManagedUser,
  UserActivity,
  UserOperation,
  UserOpsStats,
  UserWriteInput,
} from "@/lib/users/types";
interface UserRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  language: string;
  createdAt: Date;
  driver: {
    id: string;
    status: DriverStatus;
    vehicleType: string;
    lastActive: Date;
    vehicle: { id: string; plateNumber: string } | null;
  } | null;
}

interface OrderBucket {
  openOrders: number;
  deliveredOrders: number;
  canceledOrders: number;
}

const emptyStats = (): UserOpsStats => ({
  openOrders: 0,
  deliveredOrders: 0,
  canceledOrders: 0,
  stores: 0,
  recordedActions: 0,
});

const orderActivitySelect = {
  id: true,
  orderNumber: true,
  status: true,
  customerPhone: true,
  cancelReason: true,
  updatedAt: true,
  store: { select: { name: true } },
  driver: { select: { user: { select: { name: true } } } },
} as const;

const userInclude = {
  driver: {
    include: {
      vehicle: { select: { id: true, plateNumber: true } },
    },
  },
} as const;

function emptyBucket(): OrderBucket {
  return { openOrders: 0, deliveredOrders: 0, canceledOrders: 0 };
}

function addCount(bucket: OrderBucket, status: string, count: number): void {
  if (status === "DELIVERED") {
    bucket.deliveredOrders += count;
  } else if (status === "CANCELED") {
    bucket.canceledOrders += count;
  } else {
    bucket.openOrders += count;
  }
}

function serializeUser(row: UserRow, stats: UserOpsStats): ManagedUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    language: row.language,
    createdAt: row.createdAt.toISOString(),
    stats,
    driver: row.driver
      ? {
          id: row.driver.id,
          status: row.driver.status,
          vehicleType: row.driver.vehicleType,
          lastActive: row.driver.lastActive.toISOString(),
          vehicle: row.driver.vehicle,
        }
      : null,
  };
}

async function statsForRows(rows: UserRow[]): Promise<Map<string, UserOpsStats>> {
  const stats = new Map<string, UserOpsStats>();
  if (rows.length === 0) {
    return stats;
  }

  for (const row of rows) {
    stats.set(row.id, emptyStats());
  }

  const driverIds = rows.flatMap((row) => (row.driver ? [row.driver.id] : []));
  const customerPhones = rows.filter((row) => row.role === "CUSTOMER").map((row) => row.phone);
  const userIds = rows.map((row) => row.id);

  const [driverGroups, phoneGroups, stores, storeGroups, auditGroups] = await Promise.all([
    driverIds.length === 0
      ? Promise.resolve([])
      : prisma.order.groupBy({
          by: ["driverId", "status"],
          where: { driverId: { in: driverIds }, bundleRole: { not: "CHILD" } },
          _count: { id: true },
        }),
    customerPhones.length === 0
      ? Promise.resolve([])
      : prisma.order.groupBy({
          by: ["customerPhone", "status"],
          where: { customerPhone: { in: customerPhones }, bundleRole: { not: "CHILD" } },
          _count: { id: true },
        }),
    prisma.store.findMany({
      where: { ownerId: { in: userIds } },
      select: { id: true, ownerId: true },
    }),
    prisma.order.groupBy({
      by: ["storeId", "status"],
      where: { store: { ownerId: { in: userIds } }, bundleRole: { not: "CHILD" } },
      _count: { id: true },
    }),
    prisma.auditLog.groupBy({
      by: ["userId"],
      where: { userId: { in: userIds } },
      _count: { id: true },
    }),
  ]);

  const driverBuckets = new Map<string, OrderBucket>();
  for (const group of driverGroups) {
    if (!group.driverId) {
      continue;
    }
    const bucket = driverBuckets.get(group.driverId) ?? emptyBucket();
    addCount(bucket, group.status, group._count.id);
    driverBuckets.set(group.driverId, bucket);
  }

  const phoneBuckets = new Map<string, OrderBucket>();
  for (const group of phoneGroups) {
    const bucket = phoneBuckets.get(group.customerPhone) ?? emptyBucket();
    addCount(bucket, group.status, group._count.id);
    phoneBuckets.set(group.customerPhone, bucket);
  }

  const storeOwner = new Map(stores.flatMap((store) => (store.ownerId ? [[store.id, store.ownerId] as const] : [])));
  const ownerBuckets = new Map<string, OrderBucket>();
  const storeCounts = new Map<string, number>();
  for (const store of stores) {
    if (!store.ownerId) {
      continue;
    }
    storeCounts.set(store.ownerId, (storeCounts.get(store.ownerId) ?? 0) + 1);
  }
  for (const group of storeGroups) {
    if (!group.storeId) {
      continue;
    }
    const ownerId = storeOwner.get(group.storeId);
    if (!ownerId) {
      continue;
    }
    const bucket = ownerBuckets.get(ownerId) ?? emptyBucket();
    addCount(bucket, group.status, group._count.id);
    ownerBuckets.set(ownerId, bucket);
  }

  const recorded = new Map<string, number>();
  for (const group of auditGroups) {
    if (group.userId) {
      recorded.set(group.userId, group._count.id);
    }
  }

  for (const row of rows) {
    const current = stats.get(row.id) ?? emptyStats();
    current.stores = storeCounts.get(row.id) ?? 0;
    current.recordedActions = recorded.get(row.id) ?? 0;
    const bucket =
      row.role === "DRIVER" && row.driver
        ? driverBuckets.get(row.driver.id)
        : row.role === "CUSTOMER"
          ? phoneBuckets.get(row.phone)
          : ownerBuckets.get(row.id);
    if (bucket) {
      current.openOrders = bucket.openOrders;
      current.deliveredOrders = bucket.deliveredOrders;
      current.canceledOrders = bucket.canceledOrders;
    }
    stats.set(row.id, current);
  }

  return stats;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function listManagedUsers(): Promise<ManagedUser[]> {
  await bootstrapDispatchData();

  const rows = await prisma.user.findMany({
    include: userInclude,
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  const stats = await statsForRows(rows);
  return rows.map((row) => serializeUser(row, stats.get(row.id) ?? emptyStats()));
}

async function assertUniqueContact(
  email: string,
  phone: string,
  excludeId?: string,
): Promise<void> {
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { phone }],
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { email: true, phone: true },
  });

  if (!existing) {
    return;
  }

  if (existing.email === email) {
    throw new Error("Email is already in use.");
  }

  throw new Error("Phone is already in use.");
}

export async function createManagedUser(input: UserWriteInput): Promise<ManagedUser> {
  const email = normalizeEmail(input.email);
  await assertUniqueContact(email, input.phone);

  const passwordHash = hashPassword(input.password?.trim() || DEMO_PASSWORD);
  const language = input.language === "en" ? "en" : "ar";
  const vehicleType = input.vehicleType?.trim() || "Van";

  const created = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: input.name,
        email,
        phone: input.phone,
        role: input.role,
        language,
        passwordHash,
        ...(input.role === "DRIVER"
          ? {
              driver: {
                create: {
                  status: "OFFLINE",
                  vehicleType,
                },
              },
            }
          : {}),
      },
      include: userInclude,
    });

    if (input.role === "DRIVER" && user.driver && input.vehicleId) {
      await tx.vehicle.updateMany({
        where: { driverId: user.driver.id },
        data: { driverId: null },
      });
      const assigned = await tx.vehicle.update({
        where: { id: input.vehicleId },
        data: { driverId: user.driver.id },
        select: { type: true },
      });
      await tx.driver.update({
        where: { id: user.driver.id },
        data: { vehicleType: assigned.type },
      });
    }

    return tx.user.findUniqueOrThrow({
      where: { id: user.id },
      include: userInclude,
    });
  });

  const stats = await statsForRows([created]);
  return serializeUser(created, stats.get(created.id) ?? emptyStats());
}

export async function updateManagedUser(
  id: string,
  input: Partial<UserWriteInput>,
): Promise<ManagedUser | null> {
  const existing = await prisma.user.findUnique({
    where: { id },
    include: { driver: { select: { id: true } } },
  });

  if (!existing) {
    return null;
  }

  const email = input.email ? normalizeEmail(input.email) : existing.email;
  const phone = input.phone ?? existing.phone;
  await assertUniqueContact(email, phone, id);

  const nextRole = input.role ?? existing.role;
  const language = input.language
    ? input.language === "en"
      ? "en"
      : "ar"
    : existing.language;

  const data: Prisma.UserUpdateInput = {
    name: input.name ?? existing.name,
    email,
    phone,
    role: nextRole,
    language,
  };

  if (input.password?.trim()) {
    data.passwordHash = hashPassword(input.password.trim());
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id },
      data,
    });

    if (nextRole === "DRIVER") {
      const vehicleType = input.vehicleType?.trim() || "Van";
      const driver = existing.driver
        ? await tx.driver.update({
            where: { id: existing.driver.id },
            data: { vehicleType },
            select: { id: true },
          })
        : await tx.driver.create({
            data: {
              userId: id,
              status: "OFFLINE",
              vehicleType,
            },
            select: { id: true },
          });

      if (input.vehicleId !== undefined) {
        await tx.vehicle.updateMany({
          where: { driverId: driver.id },
          data: { driverId: null },
        });

        if (input.vehicleId) {
          const assigned = await tx.vehicle.update({
            where: { id: input.vehicleId },
            data: { driverId: driver.id },
            select: { type: true },
          });
          await tx.driver.update({
            where: { id: driver.id },
            data: { vehicleType: assigned.type },
          });
        }
      }
    } else if (existing.driver && input.vehicleId !== undefined) {
      await tx.vehicle.updateMany({
        where: { driverId: existing.driver.id },
        data: { driverId: null },
      });
    }
  });

  const row = await prisma.user.findUniqueOrThrow({
    where: { id },
    include: userInclude,
  });

  const stats = await statsForRows([row]);
  return serializeUser(row, stats.get(row.id) ?? emptyStats());
}

function noteFromDetails(details: Prisma.JsonValue): string | null {
  if (!details || typeof details !== "object" || Array.isArray(details)) {
    return null;
  }

  const record = details as Record<string, Prisma.JsonValue>;
  const reason = typeof record.reason === "string" ? record.reason : null;
  const from = typeof record.from === "string" ? record.from : null;
  const to = typeof record.to === "string" ? record.to : null;
  if (reason) {
    return reason;
  }
  if (from && to) {
    return `${from} → ${to}`;
  }
  return null;
}

export async function getUserActivity(userId: string): Promise<UserActivity | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      phone: true,
      driver: { select: { id: true } },
      ownedStores: { select: { id: true, name: true, phone: true, active: true } },
    },
  });

  if (!user) {
    return null;
  }

  const driverId = user.driver?.id ?? null;
  const storeIds = user.ownedStores.map((store) => store.id);
  const auditWhere: Prisma.AuditLogWhereInput = driverId
    ? {
        OR: [{ userId: user.id }, { details: { path: ["driverId"], equals: driverId } }],
      }
    : { userId: user.id };

  const [asCustomer, asDriver, asStore, audits] = await Promise.all([
    prisma.order.findMany({
      where: {
        bundleRole: { not: "CHILD" },
        OR: [{ customerId: user.id }, { customerPhone: user.phone }],
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: orderActivitySelect,
    }),
    driverId
      ? prisma.order.findMany({
          where: { driverId, bundleRole: { not: "CHILD" } },
          orderBy: { updatedAt: "desc" },
          take: 20,
          select: orderActivitySelect,
        })
      : Promise.resolve([]),
    storeIds.length === 0
      ? Promise.resolve([])
      : prisma.order.findMany({
          where: { storeId: { in: storeIds }, bundleRole: { not: "CHILD" } },
          orderBy: { updatedAt: "desc" },
          take: 20,
          select: orderActivitySelect,
        }),
    prisma.auditLog.findMany({
      where: auditWhere,
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        action: true,
        createdAt: true,
        details: true,
        userId: true,
        order: {
          select: {
            orderNumber: true,
            status: true,
            store: { select: { name: true } },
          },
        },
      },
    }),
  ]);

  const operations: UserOperation[] = [];
  const pushOrder = (
    row: (typeof asCustomer)[number],
    link: UserOperation["link"],
  ): void => {
    operations.push({
      id: `${link}-${row.id}`,
      link,
      action: row.status,
      orderNumber: row.orderNumber,
      orderStatus: row.status,
      storeName: row.store?.name ?? null,
      counterparty:
        link === "driver"
          ? row.customerPhone
          : link === "store"
            ? row.driver?.user.name ?? row.customerPhone
            : row.store?.name ?? null,
      note: row.cancelReason,
      createdAt: row.updatedAt.toISOString(),
    });
  };

  for (const row of asCustomer) {
    pushOrder(row, "customer");
  }
  for (const row of asDriver) {
    pushOrder(row, "driver");
  }
  for (const row of asStore) {
    pushOrder(row, "store");
  }
  for (const event of audits) {
    operations.push({
      id: `audit-${event.id}`,
      link: event.userId === user.id ? "recorded" : "driver",
      action: event.action,
      orderNumber: event.order.orderNumber,
      orderStatus: event.order.status,
      storeName: event.order.store?.name ?? null,
      counterparty: null,
      note: noteFromDetails(event.details),
      createdAt: event.createdAt.toISOString(),
    });
  }

  operations.sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  return {
    stores: user.ownedStores.map((store) => ({
      id: store.id,
      name: store.name,
      phone: store.phone,
      active: store.active,
    })),
    operations: operations.slice(0, 40),
  };
}

export async function deleteManagedUser(
  id: string,
  actorId: string,
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  if (id === actorId) {
    return { ok: false, error: "You cannot delete your own account.", status: 400 };
  }

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true },
  });

  if (!target) {
    return { ok: false, error: "User not found.", status: 404 };
  }

  if (target.role === "ADMIN" || target.role === "SUPER_ADMIN") {
    const adminCount = await prisma.user.count({
      where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } },
    });
    if (adminCount <= 1) {
      return { ok: false, error: "The last admin cannot be deleted.", status: 400 };
    }
  }

  await prisma.user.delete({ where: { id } });
  return { ok: true };
}
