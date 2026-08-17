import "server-only";

import { prisma } from "@/lib/db";
import { bootstrapDispatchData } from "@/lib/dispatch/bootstrap";
import type {
  FleetVehicle,
  VehicleCreateInput,
  VehicleDeleteResult,
  VehiclePatchInput,
} from "@/lib/fleet/types";
import type { DriverStatus, VehicleStatus } from "@/generated/prisma/enums";
import { geoZoneCode } from "@/lib/catalog/zone-code";

interface VehicleRow {
  id: string;
  plateNumber: string;
  model: string;
  type: string;
  vehicleTypeId: string | null;
  capacityKg: number;
  currentLoadPct: number;
  status: VehicleStatus;
  zone: string;
  zoneId: string | null;
  deliveryZone: { name: string; code: string } | null;
  fleetType: { name: string; maxWeightKg: number } | null;
  driver: {
    id: string;
    status: DriverStatus;
    user: { name: string };
  } | null;
}

function serializeVehicle(row: VehicleRow): FleetVehicle {
  return {
    id: row.id,
    plateNumber: row.plateNumber,
    model: row.model,
    type: row.fleetType?.name ?? row.type,
    vehicleTypeId: row.vehicleTypeId,
    capacityKg: row.capacityKg,
    currentLoadPct: row.currentLoadPct,
    status: row.status,
    zone: row.deliveryZone?.code ?? row.zone,
    zoneName: row.deliveryZone?.name ?? row.zone,
    zoneId: row.zoneId,
    driver: row.driver
      ? {
          id: row.driver.id,
          name: row.driver.user.name,
          status: row.driver.status,
        }
      : null,
  };
}

const vehicleInclude = {
  deliveryZone: { select: { name: true, code: true } },
  fleetType: { select: { name: true, maxWeightKg: true } },
  driver: {
    include: {
      user: { select: { name: true } },
    },
  },
} as const;

async function resolveZone(zoneId?: string, zoneCode?: string, currentId?: string | null) {
  if (zoneId) {
    const row = await prisma.zone.findFirst({
      where: {
        id: zoneId,
        ...(zoneId === currentId ? {} : { active: true }),
      },
      select: { id: true, code: true, name: true },
    });
    if (!row) {
      throw new Error("Invalid or inactive zone.");
    }
    return row;
  }

  if (zoneCode) {
    const generated = geoZoneCode(zoneCode);
    const row = await prisma.zone.findFirst({
      where: {
        active: true,
        OR: [{ code: zoneCode }, { code: generated }],
      },
      select: { id: true, code: true, name: true },
    });
    if (!row) {
      throw new Error("Invalid or inactive zone.");
    }
    return row;
  }

  throw new Error("Zone is required.");
}

async function resolveType(
  vehicleTypeId?: string,
  typeName?: string,
  currentId?: string | null,
) {
  if (vehicleTypeId) {
    const row = await prisma.vehicleType.findFirst({
      where: {
        id: vehicleTypeId,
        ...(vehicleTypeId === currentId ? {} : { active: true }),
      },
      select: { id: true, name: true, maxWeightKg: true },
    });
    if (!row) {
      throw new Error("Invalid or inactive vehicle type.");
    }
    return row;
  }

  if (typeName) {
    const row = await prisma.vehicleType.findFirst({
      where: { name: typeName, active: true },
      select: { id: true, name: true, maxWeightKg: true },
    });
    if (row) {
      return row;
    }
  }

  throw new Error("Vehicle type is required.");
}

export async function listFleetVehicles(): Promise<FleetVehicle[]> {
  await bootstrapDispatchData();

  const rows = await prisma.vehicle.findMany({
    include: vehicleInclude,
    orderBy: [{ status: "asc" }, { plateNumber: "asc" }],
  });

  return rows.map(serializeVehicle);
}

export async function createFleetVehicle(input: VehicleCreateInput): Promise<FleetVehicle> {
  const zone = await resolveZone(input.zoneId, input.zone);
  const fleetType = await resolveType(input.vehicleTypeId, input.type);
  const capacityKg = input.capacityKg && input.capacityKg > 0 ? input.capacityKg : fleetType.maxWeightKg;

  const plateNumber = input.plateNumber.trim().toUpperCase();
  const taken = await prisma.vehicle.findUnique({
    where: { plateNumber },
    select: { id: true },
  });

  if (taken) {
    throw new Error("Plate number is already registered.");
  }

  const row = await prisma.vehicle.create({
    data: {
      plateNumber,
      model: input.model.trim(),
      type: fleetType.name,
      capacityKg,
      currentLoadPct: 0,
      status: "ACTIVE",
      zone: zone.code,
      zoneId: zone.id,
      vehicleTypeId: fleetType.id,
    },
    include: vehicleInclude,
  });

  return serializeVehicle(row);
}

export async function updateFleetVehicle(
  id: string,
  patch: VehiclePatchInput,
): Promise<FleetVehicle | null> {
  const existing = await prisma.vehicle.findUnique({
    where: { id },
    select: { id: true, zoneId: true, vehicleTypeId: true, plateNumber: true },
  });

  if (!existing) {
    return null;
  }

  const plateNumber = patch.plateNumber?.trim().toUpperCase();
  if (plateNumber) {
    const taken = await prisma.vehicle.findFirst({
      where: { plateNumber, NOT: { id } },
      select: { id: true },
    });
    if (taken) {
      throw new Error("Plate number is already registered.");
    }
  }

  const model = patch.model?.trim();
  if (patch.model !== undefined && !model) {
    throw new Error("Model is required.");
  }

  if (patch.capacityKg != null && !(patch.capacityKg > 0)) {
    throw new Error("Capacity must be greater than zero.");
  }

  let zoneUpdate: { zone: string; zoneId: string } | undefined;
  if (patch.zoneId || patch.zone) {
    const zone = await resolveZone(patch.zoneId ?? undefined, patch.zone, existing.zoneId);
    zoneUpdate = { zone: zone.code, zoneId: zone.id };
  }

  let typeUpdate: { type: string; vehicleTypeId: string } | undefined;
  let capacityFromType: number | undefined;
  if (patch.vehicleTypeId) {
    const fleetType = await resolveType(
      patch.vehicleTypeId,
      undefined,
      existing.vehicleTypeId,
    );
    typeUpdate = {
      type: fleetType.name,
      vehicleTypeId: fleetType.id,
    };
    if (patch.capacityKg == null && patch.vehicleTypeId !== existing.vehicleTypeId) {
      capacityFromType = fleetType.maxWeightKg;
    }
  }

  if (patch.driverId) {
    const driver = await prisma.driver.findUnique({
      where: { id: patch.driverId },
      select: { id: true },
    });

    if (!driver) {
      throw new Error("Driver not found.");
    }
  }

  const row = await prisma.vehicle.update({
    where: { id },
    data: {
      ...(plateNumber ? { plateNumber } : {}),
      ...(model ? { model } : {}),
      ...(patch.status ? { status: patch.status } : {}),
      ...(zoneUpdate ?? {}),
      ...(typeUpdate ?? {}),
      ...(patch.capacityKg != null
        ? { capacityKg: patch.capacityKg }
        : capacityFromType != null
          ? { capacityKg: capacityFromType }
          : {}),
      ...(patch.currentLoadPct != null ? { currentLoadPct: patch.currentLoadPct } : {}),
      ...(patch.driverId !== undefined ? { driverId: patch.driverId } : {}),
    },
    include: vehicleInclude,
  });

  return serializeVehicle(row);
}

export async function deleteFleetVehicle(id: string): Promise<VehicleDeleteResult | null> {
  const existing = await prisma.vehicle.findUnique({
    where: { id },
    include: vehicleInclude,
  });

  if (!existing) {
    return null;
  }

  const driver = existing.driver;

  if (driver && driver.status === "BUSY") {
    const row = await prisma.vehicle.update({
      where: { id },
      data: { driverId: null, status: "INACTIVE" },
      include: vehicleInclude,
    });

    return {
      id: existing.id,
      deleted: false,
      deactivated: true,
      unassignedDriver: true,
      driverName: driver.user.name,
      plateNumber: existing.plateNumber,
      vehicle: serializeVehicle(row),
    };
  }

  await prisma.$transaction(async (tx) => {
    if (existing.driverId) {
      await tx.vehicle.update({
        where: { id },
        data: { driverId: null },
      });
    }
    await tx.vehicle.delete({ where: { id } });
  });

  return {
    id: existing.id,
    deleted: true,
    deactivated: false,
    unassignedDriver: Boolean(driver),
    driverName: driver?.user.name ?? null,
    plateNumber: existing.plateNumber,
    vehicle: null,
  };
}
