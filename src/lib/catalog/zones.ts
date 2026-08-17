import "server-only";

import { prisma } from "@/lib/db";
import type { DeliveryZone, ZoneWriteInput } from "@/lib/catalog/types";
import { geoZoneCode, makeZoneCode } from "@/lib/catalog/zone-code";
import { bootstrapDispatchData } from "@/lib/dispatch/bootstrap";

function serializeZone(row: {
  id: string;
  name: string;
  code: string;
  city: string;
  active: boolean;
  _count: { vehicles: number };
}): DeliveryZone {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    city: row.city,
    active: row.active,
    vehicleCount: row._count.vehicles,
  };
}

const zoneInclude = {
  _count: { select: { vehicles: true } },
} as const;

export async function listZones(activeOnly = false): Promise<DeliveryZone[]> {
  await bootstrapDispatchData();

  const rows = await prisma.zone.findMany({
    where: activeOnly ? { active: true } : undefined,
    include: zoneInclude,
    orderBy: [{ city: "asc" }, { name: "asc" }],
  });
  return rows.map(serializeZone);
}

export async function findZoneByCode(code: string): Promise<{
  id: string;
  code: string;
  name: string;
  active: boolean;
} | null> {
  return prisma.zone.findFirst({
    where: { OR: [{ code }, { code: geoZoneCode(code) }] },
    select: { id: true, code: true, name: true, active: true },
  });
}

async function allocateZoneCode(
  city: string,
  area: string,
  excludeId?: string,
): Promise<string> {
  const base = makeZoneCode(city, area);
  let candidate = base;
  let suffix = 2;

  while (true) {
    const taken = await prisma.zone.findUnique({
      where: { code: candidate },
      select: { id: true },
    });
    if (!taken || taken.id === excludeId) {
      return candidate;
    }
    candidate = `${base}${suffix}`;
    suffix += 1;
  }
}

export async function createZone(input: ZoneWriteInput): Promise<DeliveryZone> {
  const name = input.name.trim();
  const city = input.city.trim();
  if (!name || !city) {
    throw new Error("Name and city are required.");
  }

  const code = await allocateZoneCode(city, name);

  const row = await prisma.zone.create({
    data: {
      name,
      code,
      city,
      active: input.active ?? true,
    },
    include: zoneInclude,
  });

  return serializeZone(row);
}

export async function updateZone(
  id: string,
  input: Partial<ZoneWriteInput>,
): Promise<DeliveryZone | null> {
  const existing = await prisma.zone.findUnique({
    where: { id },
    select: { id: true, name: true, city: true, code: true },
  });
  if (!existing) {
    return null;
  }

  const name = input.name?.trim() || existing.name;
  const city = input.city?.trim() || existing.city;
  const rename = Boolean(input.name?.trim() || input.city?.trim());
  const code = rename ? await allocateZoneCode(city, name, id) : existing.code;

  const row = await prisma.zone.update({
    where: { id },
    data: {
      name,
      city,
      code,
      ...(input.active !== undefined ? { active: input.active } : {}),
    },
    include: zoneInclude,
  });

  await prisma.vehicle.updateMany({
    where: { zoneId: id },
    data: { zone: row.code },
  });

  return serializeZone(row);
}

export async function deleteZone(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const existing = await prisma.zone.findUnique({
    where: { id },
    include: { _count: { select: { vehicles: true } } },
  });

  if (!existing) {
    return { ok: false, error: "Zone not found.", status: 404 };
  }

  if (existing._count.vehicles > 0) {
    await prisma.zone.update({ where: { id }, data: { active: false } });
    return { ok: false, error: "Zone is in use. It was deactivated instead.", status: 409 };
  }

  await prisma.zone.delete({ where: { id } });
  return { ok: true };
}
