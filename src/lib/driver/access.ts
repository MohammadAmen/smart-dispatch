import "server-only";

import { prisma } from "@/lib/db";
import { readSession } from "@/lib/auth/server";
import type { DriverAccess } from "@/lib/driver/types";

export type { DriverAccess };

export async function resolveDriverAccess(): Promise<DriverAccess> {
  const session = await readSession();
  if (!session || session.role !== "DRIVER") {
    return { kind: "staff" };
  }

  const driver = await prisma.driver.findUnique({
    where: { userId: session.sub },
    select: {
      id: true,
      vehicle: { select: { id: true } },
    },
  });

  if (driver?.vehicle) {
    return { kind: "self", driverId: driver.id };
  }

  return { kind: "unassigned" };
}
