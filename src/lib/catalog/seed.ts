import "server-only";

import { prisma } from "@/lib/db";
import { geoZoneCode, makeZoneCode } from "@/lib/catalog/zone-code";

const SEED_ZONES = [
  { name: "المركز", city: "عمّان", geo: "core" },
  { name: "الشمال", city: "عمّان", geo: "north" },
  { name: "الغرب", city: "عمّان", geo: "west" },
  { name: "الشرق", city: "عمّان", geo: "east" },
  { name: "المطار", city: "عمّان", geo: "airport" },
  { name: "المستودع", city: "عمّان", geo: "depot" },
  { name: "الشعلان", city: "دمشق" },
  { name: "المزة", city: "دمشق" },
] as const;

const SEED_TYPES = [
  { name: "فان صغير", maxWeightKg: 900, icon: "truck" },
  { name: "بيك أب", maxWeightKg: 650, icon: "car" },
  { name: "دراجة نارية", maxWeightKg: 45, icon: "bike" },
  { name: "شاحنة تبريد", maxWeightKg: 1800, icon: "snowflake" },
] as const;

function matchTypeId(
  type: string,
  types: Array<{ id: string; name: string; icon: string }>,
): string | null {
  const upper = type.toUpperCase();
  const byIcon =
    upper.includes("MOPED") || upper.includes("BIKE") || type.includes("دراجة")
      ? "bike"
      : upper.includes("PICK") || type.includes("بيك")
        ? "car"
        : upper.includes("REEFER") || type.includes("تبريد")
          ? "snowflake"
          : "truck";

  return types.find((row) => row.icon === byIcon)?.id ?? types[0]?.id ?? null;
}

export async function seedCatalog(): Promise<void> {
  if (typeof prisma.zone?.upsert !== "function") {
    return;
  }

  for (const zone of SEED_ZONES) {
    const code = makeZoneCode(zone.city, zone.name);
    const aliases = "geo" in zone ? [zone.geo, geoZoneCode(zone.geo)] : [];
    const existing = await prisma.zone.findFirst({
      where: {
        OR: [
          { code },
          ...aliases.map((alias) => ({ code: alias })),
          { name: zone.name, city: zone.city },
        ],
      },
      select: { id: true },
    });

    if (existing) {
      await prisma.zone.update({
        where: { id: existing.id },
        data: { name: zone.name, city: zone.city, code, active: true },
      });
      continue;
    }

    await prisma.zone.create({
      data: { name: zone.name, city: zone.city, code, active: true },
    });
  }

  if (typeof prisma.vehicleType?.upsert !== "function") {
    return;
  }

  for (const type of SEED_TYPES) {
    await prisma.vehicleType.upsert({
      where: { name: type.name },
      update: {},
      create: { ...type, active: true },
    });
  }

  const [zones, types, vehicles] = await Promise.all([
    prisma.zone.findMany({ select: { id: true, code: true } }),
    prisma.vehicleType.findMany({ select: { id: true, name: true, icon: true } }),
    prisma.vehicle.findMany({
      where: { OR: [{ zoneId: null }, { vehicleTypeId: null }] },
      select: { id: true, zone: true, type: true, zoneId: true, vehicleTypeId: true },
    }),
  ]);

  const zoneByCode = new Map(zones.map((row) => [row.code, row.id]));

  for (const vehicle of vehicles) {
    const zoneId =
      vehicle.zoneId ??
      zoneByCode.get(vehicle.zone) ??
      zoneByCode.get(geoZoneCode(vehicle.zone)) ??
      null;

    await prisma.vehicle.update({
      where: { id: vehicle.id },
      data: {
        zoneId,
        vehicleTypeId: vehicle.vehicleTypeId ?? matchTypeId(vehicle.type, types),
      },
    });
  }
}
