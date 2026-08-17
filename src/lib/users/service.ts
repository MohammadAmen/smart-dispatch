import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import type { DriverStatus, Role } from "@/generated/prisma/enums";
import { DEMO_PASSWORD } from "@/lib/auth/constants";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db";
import { bootstrapDispatchData } from "@/lib/dispatch/bootstrap";
import type { ManagedUser, UserWriteInput } from "@/lib/users/types";

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
    vehicle: { id: string; plateNumber: string } | null;
  } | null;
}

const userInclude = {
  driver: {
    include: {
      vehicle: { select: { id: true, plateNumber: true } },
    },
  },
} as const;

function serializeUser(row: UserRow): ManagedUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    language: row.language,
    createdAt: row.createdAt.toISOString(),
    driver: row.driver
      ? {
          id: row.driver.id,
          status: row.driver.status,
          vehicleType: row.driver.vehicleType,
          vehicle: row.driver.vehicle,
        }
      : null,
  };
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

  return rows.map(serializeUser);
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

  return serializeUser(created);
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

  return serializeUser(row);
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

  if (target.role === "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      return { ok: false, error: "The last admin cannot be deleted.", status: 400 };
    }
  }

  await prisma.user.delete({ where: { id } });
  return { ok: true };
}
