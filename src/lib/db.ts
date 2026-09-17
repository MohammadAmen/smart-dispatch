import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/** Bump when Prisma schema fields change so the HMR singleton is recreated. */
const PRISMA_SCHEMA_REV = "postgresql-neon-v1";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaSchemaRev: string | undefined;
};

function hasModelDelegate(client: PrismaClient, name: "searchLog" | "cartIntent" | "storeTable"): boolean {
  const delegate = (client as unknown as Record<string, { findMany?: unknown } | undefined>)[name];
  return typeof delegate?.findMany === "function";
}

function postgresConnectionString(): string {
  const candidates = [process.env.DATABASE_URL, process.env.DIRECT_URL];

  for (const value of candidates) {
    if (
      value &&
      (value.startsWith("postgres://") || value.startsWith("postgresql://"))
    ) {
      return value;
    }
  }

  throw new Error(
    "DATABASE_URL must be a PostgreSQL connection string (postgresql://user@host/database).",
  );
}

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg(postgresConnectionString());
  return new PrismaClient({ adapter });
}

if (
  globalForPrisma.prismaSchemaRev !== PRISMA_SCHEMA_REV ||
  (globalForPrisma.prisma &&
    (!hasModelDelegate(globalForPrisma.prisma, "searchLog") ||
      !hasModelDelegate(globalForPrisma.prisma, "cartIntent") ||
      !hasModelDelegate(globalForPrisma.prisma, "storeTable")))
) {
  void globalForPrisma.prisma?.$disconnect();
  globalForPrisma.prisma = undefined;
  globalForPrisma.prismaSchemaRev = PRISMA_SCHEMA_REV;
}

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
