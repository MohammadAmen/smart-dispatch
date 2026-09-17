import "server-only";

import { randomBytes } from "node:crypto";

import { prisma } from "@/lib/db";

export function createTrackingToken(): string {
  return randomBytes(24).toString("base64url");
}

export async function persistOrderTrackingToken(orderId: string, token: string): Promise<void> {
  await prisma.$executeRaw`
    UPDATE orders
    SET "trackingToken" = ${token}
    WHERE id = ${orderId}
  `;
}

export async function loadOrderTrackingToken(orderId: string): Promise<string | null> {
  try {
    const rows = await prisma.$queryRaw<{ trackingToken: string | null }[]>`
      SELECT "trackingToken"
      FROM orders
      WHERE id = ${orderId}
      LIMIT 1
    `;
    return rows[0]?.trackingToken ?? null;
  } catch {
    return null;
  }
}

export async function ensureOrderTrackingToken(orderId: string): Promise<string> {
  const existing = await loadOrderTrackingToken(orderId);
  if (existing) {
    return existing;
  }

  const token = createTrackingToken();
  await persistOrderTrackingToken(orderId, token);
  return token;
}
