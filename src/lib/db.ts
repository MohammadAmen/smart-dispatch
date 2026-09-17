import "server-only";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@/generated/prisma/client";

/** Bump when Prisma schema fields change so the HMR singleton is recreated. */
const PRISMA_SCHEMA_REV = "product-options-v1";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaSchemaRev: string | undefined;
};

function hasModelDelegate(client: PrismaClient, name: "searchLog" | "cartIntent" | "storeTable"): boolean {
  const delegate = (client as unknown as Record<string, { findMany?: unknown } | undefined>)[name];
  return typeof delegate?.findMany === "function";
}

function mysqlConnectionString(): string {
  const candidates = [process.env.DATABASE_URL, process.env.DIRECT_URL];

  for (const value of candidates) {
    if (
      value &&
      (value.startsWith("mysql://") ||
        value.startsWith("mysqls://") ||
        value.startsWith("mariadb://"))
    ) {
      return value;
    }
  }

  throw new Error(
    "DATABASE_URL must be a MySQL connection string (mysql://user@host:3306/database).",
  );
}

function mysqlPoolConfig(): {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  connectionLimit: number;
  connectTimeout: number;
} {
  const url = new URL(mysqlConnectionString());
  const database = url.pathname.replace(/^\//, "").split("/")[0] ?? "";

  if (!database) {
    throw new Error("DATABASE_URL is missing a database name.");
  }

  return {
    host: url.hostname || "127.0.0.1",
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username || "root"),
    password: decodeURIComponent(url.password),
    database,
    connectionLimit: 8,
    connectTimeout: 10_000,
  };
}

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaMariaDb(mysqlPoolConfig());
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
