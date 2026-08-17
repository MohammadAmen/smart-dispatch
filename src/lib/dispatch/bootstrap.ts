import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { DEMO_PASSWORD } from "@/lib/auth/constants";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db";
import { courierPool, liveOrders } from "@/lib/live-map";
import { orderWithDriver } from "@/lib/dispatch/order-mapper";
import { zoneFromPoint } from "@/lib/fleet/zones";
import { seedCatalog } from "@/lib/catalog/seed";
import { geoZoneCode } from "@/lib/catalog/zone-code";

const DEMO_EMAIL_DOMAIN = "fleet.smart-dispatch.local";

const VEHICLE_MODELS: Record<string, { model: string; type: string; capacityKg: number }> = {
  VAN: { model: "Toyota HiAce", type: "Van", capacityKg: 900 },
  PICKUP: { model: "Isuzu D-Max", type: "Pickup", capacityKg: 650 },
  MOPED: { model: "Honda PCX", type: "Moped", capacityKg: 45 },
};

let bootstrapLock: Promise<void> | null = null;

function demoEmail(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
  return `${slug}@${DEMO_EMAIL_DOMAIN}`;
}

function demoPhone(index: number): string {
  return `+96279000${String(1000 + index)}`;
}

function vehicleSpec(vehicleType: string): { model: string; type: string; capacityKg: number } {
  const key = vehicleType.toUpperCase().startsWith("VAN")
    ? "VAN"
    : vehicleType.toUpperCase().startsWith("PICK")
      ? "PICKUP"
      : vehicleType.toUpperCase().includes("MOPED")
        ? "MOPED"
        : "VAN";
  return VEHICLE_MODELS[key];
}

export async function bootstrapDispatchData(): Promise<void> {
  if (!bootstrapLock) {
    bootstrapLock = runBootstrap().catch((error: unknown) => {
      bootstrapLock = null;
      throw error;
    });
  }

  await bootstrapLock;
}

async function runBootstrap(): Promise<void> {
  const [orderCount, driverCount] = await Promise.all([
    prisma.order.count(),
    prisma.driver.count(),
  ]);

  if (driverCount === 0) {
    await seedFleet();
  }

  if (orderCount === 0) {
    await seedOrders();
  }

  await seedCatalog();
  await seedStaffUsers();
  await seedMissingPasswords();
  await seedMissingVehicles();
}

async function seedFleet(): Promise<void> {
  const namedDrivers = new Map<string, (typeof liveOrders)[number]>();
  for (const order of liveOrders) {
    if (order.driverName !== "—") {
      namedDrivers.set(order.driverName, order);
    }
  }

  const poolByName = new Map(courierPool.map((item) => [item.driverName, item]));
  const names = new Set([...namedDrivers.keys(), ...poolByName.keys()]);
  const passwordHash = hashPassword(DEMO_PASSWORD);

  let index = 0;
  for (const name of names) {
    const fromOrder = namedDrivers.get(name);
    const fromPool = poolByName.get(name);
    const point = fromOrder?.driver ?? fromPool?.driver;
    if (!point) {
      continue;
    }

    const hasActiveJob = liveOrders.some(
      (order) =>
        order.driverName === name &&
        (order.status === "ASSIGNED" || order.status === "IN_TRANSIT"),
    );

    await prisma.user.create({
      data: {
        name,
        email: demoEmail(name),
        phone: demoPhone(index),
        role: "DRIVER",
        language: "ar",
        passwordHash,
        driver: {
          create: {
            status: hasActiveJob ? "BUSY" : "AVAILABLE",
            vehicleType: fromOrder?.vehicleId ?? fromPool?.vehicleId ?? "Van",
            latitude: point[0],
            longitude: point[1],
          },
        },
      },
    });

    index += 1;
  }
}

async function seedOrders(): Promise<void> {
  const drivers = await prisma.driver.findMany({
    include: { user: { select: { name: true } } },
  });
  const driverByName = new Map(drivers.map((driver) => [driver.user.name, driver]));

  const rows: Prisma.OrderCreateManyInput[] = liveOrders.map((order) => {
    const driver = order.driverName === "—" ? null : driverByName.get(order.driverName);

    return {
      orderNumber: order.id,
      status: order.status,
      customerPhone: order.customerPhone,
      addressText: order.destination.ar,
      pickupLat: order.driver[0],
      pickupLng: order.driver[1],
      deliveryLat: order.destinationPoint[0],
      deliveryLng: order.destinationPoint[1],
      driverId: order.status === "PENDING" || order.status === "CANCELED" ? null : (driver?.id ?? null),
      codAmount: order.status === "DELIVERED" ? 18.5 : 12,
      cashSettledAt: order.status === "DELIVERED" ? new Date() : null,
    };
  });

  if (rows.length > 0) {
    await prisma.order.createMany({ data: rows });
  }
}

async function seedStaffUsers(): Promise<void> {
  const passwordHash = hashPassword(DEMO_PASSWORD);
  const staff = [
    {
      name: "Dana Khalil",
      email: `dana@${DEMO_EMAIL_DOMAIN}`,
      phone: "+962790009001",
      role: "DISPATCHER" as const,
    },
    {
      name: "Nour Admin",
      email: `admin@${DEMO_EMAIL_DOMAIN}`,
      phone: "+962790009000",
      role: "ADMIN" as const,
    },
  ];

  for (const person of staff) {
    await prisma.user.upsert({
      where: { email: person.email },
      update: {
        role: person.role,
        passwordHash,
      },
      create: {
        ...person,
        language: "ar",
        passwordHash,
      },
    });
  }
}

async function seedMissingPasswords(): Promise<void> {
  const missing = await prisma.user.findMany({
    where: { passwordHash: null },
    select: { id: true },
  });

  if (missing.length === 0) {
    return;
  }

  const passwordHash = hashPassword(DEMO_PASSWORD);
  await prisma.user.updateMany({
    where: { id: { in: missing.map((row) => row.id) } },
    data: { passwordHash },
  });
}

function nextDemoPlate(used: Set<string>): string {
  let sequence = 4100;
  let plate = `JO-${String(sequence)}`;
  while (used.has(plate)) {
    sequence += 1;
    plate = `JO-${String(sequence)}`;
  }
  used.add(plate);
  return plate;
}

async function seedMissingVehicles(): Promise<void> {
  const [drivers, existingPlates, orphans] = await Promise.all([
    prisma.driver.findMany({
      include: { vehicle: true },
    }),
    prisma.vehicle.findMany({ select: { plateNumber: true } }),
    prisma.vehicle.findMany({
      where: { driverId: null },
      orderBy: { plateNumber: "asc" },
    }),
  ]);

  const usedPlates = new Set(existingPlates.map((row) => row.plateNumber));
  const spare = [...orphans];

  for (const driver of drivers) {
    if (driver.vehicle) {
      continue;
    }

    const spareVehicle = spare.shift();
    if (spareVehicle) {
      await prisma.vehicle.update({
        where: { id: spareVehicle.id },
        data: { driverId: driver.id },
      });
      continue;
    }

    const spec = vehicleSpec(driver.vehicleType);
    const lat = driver.latitude ?? 31.9539;
    const lng = driver.longitude ?? 35.9106;
    const zoneCode = zoneFromPoint(lat, lng);
    const generatedCode = geoZoneCode(zoneCode);
    const [zoneRow, typeRows] = await Promise.all([
      typeof prisma.zone?.findFirst === "function"
        ? prisma.zone.findFirst({
            where: { OR: [{ code: zoneCode }, { code: generatedCode }] },
            select: { id: true, code: true },
          })
        : Promise.resolve(null),
      typeof prisma.vehicleType?.findMany === "function"
        ? prisma.vehicleType.findMany({ select: { id: true, name: true, icon: true } })
        : Promise.resolve([]),
    ]);
    const typeId =
      typeRows.find((row) =>
        spec.type === "Moped"
          ? row.icon === "bike"
          : spec.type === "Pickup"
            ? row.icon === "car"
            : row.icon === "truck",
      )?.id ?? typeRows[0]?.id ?? null;
    const typeName =
      typeRows.find((row) => row.id === typeId)?.name ?? spec.type;
    const activeOrders = await prisma.order.count({
      where: {
        driverId: driver.id,
        status: { in: ["ASSIGNED", "IN_TRANSIT"] },
      },
    });

    for (let attempt = 0; attempt < 8; attempt += 1) {
      try {
        await prisma.vehicle.create({
          data: {
            plateNumber: nextDemoPlate(usedPlates),
            model: spec.model,
            type: typeName,
            capacityKg: spec.capacityKg,
            currentLoadPct: Math.min(92, activeOrders * 18),
            status: "ACTIVE",
            zone: zoneRow?.code ?? generatedCode,
            zoneId: zoneRow?.id ?? null,
            vehicleTypeId: typeId,
            driverId: driver.id,
          },
        });
        break;
      } catch (error: unknown) {
        const code =
          typeof error === "object" && error !== null && "code" in error
            ? String((error as { code: unknown }).code)
            : "";
        if (code !== "P2002") {
          throw error;
        }
      }
    }
  }
}

export async function listOrdersWithDrivers() {
  return prisma.order.findMany({
    include: orderWithDriver,
    orderBy: { createdAt: "desc" },
  });
}
