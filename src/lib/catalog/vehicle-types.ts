import "server-only";

import { prisma } from "@/lib/db";
import { isCatalogIcon, type CatalogVehicleType, type VehicleTypeWriteInput } from "@/lib/catalog/types";
import { bootstrapDispatchData } from "@/lib/dispatch/bootstrap";

function serializeType(row: {
  id: string;
  name: string;
  maxWeightKg: number;
  icon: string;
  active: boolean;
  _count: { vehicles: number };
}): CatalogVehicleType {
  return {
    id: row.id,
    name: row.name,
    maxWeightKg: row.maxWeightKg,
    icon: row.icon,
    active: row.active,
    vehicleCount: row._count.vehicles,
  };
}

const typeInclude = {
  _count: { select: { vehicles: true } },
} as const;

export async function listVehicleTypes(activeOnly = false): Promise<CatalogVehicleType[]> {
  await bootstrapDispatchData();

  const rows = await prisma.vehicleType.findMany({
    where: activeOnly ? { active: true } : undefined,
    include: typeInclude,
    orderBy: { name: "asc" },
  });
  return rows.map(serializeType);
}

export async function createVehicleType(
  input: VehicleTypeWriteInput,
): Promise<CatalogVehicleType> {
  if (!isCatalogIcon(input.icon)) {
    throw new Error("Invalid icon.");
  }

  if (!(input.maxWeightKg > 0)) {
    throw new Error("Max weight must be greater than zero.");
  }

  const name = input.name.trim();
  const taken = await prisma.vehicleType.findUnique({ where: { name }, select: { id: true } });
  if (taken) {
    throw new Error("Vehicle type name is already in use.");
  }

  const row = await prisma.vehicleType.create({
    data: {
      name,
      maxWeightKg: input.maxWeightKg,
      icon: input.icon,
      active: input.active ?? true,
    },
    include: typeInclude,
  });

  return serializeType(row);
}

export async function updateVehicleType(
  id: string,
  input: Partial<VehicleTypeWriteInput>,
): Promise<CatalogVehicleType | null> {
  const existing = await prisma.vehicleType.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    return null;
  }

  if (input.icon && !isCatalogIcon(input.icon)) {
    throw new Error("Invalid icon.");
  }

  if (input.maxWeightKg != null && !(input.maxWeightKg > 0)) {
    throw new Error("Max weight must be greater than zero.");
  }

  if (input.name) {
    const name = input.name.trim();
    const taken = await prisma.vehicleType.findFirst({
      where: { name, NOT: { id } },
      select: { id: true },
    });
    if (taken) {
      throw new Error("Vehicle type name is already in use.");
    }
    input = { ...input, name };
  }

  const row = await prisma.vehicleType.update({
    where: { id },
    data: {
      ...(input.name ? { name: input.name } : {}),
      ...(input.maxWeightKg != null ? { maxWeightKg: input.maxWeightKg } : {}),
      ...(input.icon ? { icon: input.icon } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
    },
    include: typeInclude,
  });

  await prisma.vehicle.updateMany({
    where: { vehicleTypeId: id },
    data: {
      type: row.name,
      ...(input.maxWeightKg != null ? { capacityKg: row.maxWeightKg } : {}),
    },
  });

  return serializeType(row);
}

export async function deleteVehicleType(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const existing = await prisma.vehicleType.findUnique({
    where: { id },
    include: { _count: { select: { vehicles: true } } },
  });

  if (!existing) {
    return { ok: false, error: "Vehicle type not found.", status: 404 };
  }

  if (existing._count.vehicles > 0) {
    await prisma.vehicleType.update({ where: { id }, data: { active: false } });
    return { ok: false, error: "Type is in use. It was deactivated instead.", status: 409 };
  }

  await prisma.vehicleType.delete({ where: { id } });
  return { ok: true };
}
