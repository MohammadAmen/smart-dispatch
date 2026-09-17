import "server-only";

import { prisma } from "@/lib/db";
import { runAutoAssign } from "@/lib/dispatch/auto-assign";
import { publishDispatchEvent } from "@/lib/dispatch/events";
import {
  CUSTOM_ORDER_DISPATCH_LEAD_MS,
  CUSTOM_ORDER_VENDOR_ALERT_MS,
} from "@/lib/stores/custom-order";
import { ensureCustomOrderSchema } from "@/lib/stores/custom-order-schema";

export interface ScheduledDispatchResult {
  prepared: number;
  dispatched: number;
  assigned: number;
}

export async function runScheduledDispatch(): Promise<ScheduledDispatchResult> {
  await ensureCustomOrderSchema();
  const now = Date.now();
  const dispatchBefore = new Date(now + CUSTOM_ORDER_DISPATCH_LEAD_MS);
  const prepBefore = new Date(now + CUSTOM_ORDER_VENDOR_ALERT_MS);
  const staleAfter = new Date(now - 2 * 60 * 60 * 1000);

  const toPrepare = await prisma.order.findMany({
    where: {
      orderType: "SPECIAL_CUSTOM",
      status: "PENDING",
      scheduledDate: { lte: prepBefore, gt: dispatchBefore },
    },
    select: { id: true },
  });

  if (toPrepare.length > 0) {
    await prisma.order.updateMany({
      where: { id: { in: toPrepare.map((row) => row.id) }, status: "PENDING" },
      data: { status: "PREPARING" },
    });
  }

  const due = await prisma.order.findMany({
    where: {
      orderType: "SPECIAL_CUSTOM",
      status: { in: ["PENDING", "PREPARING"] },
      scheduledDate: { lte: dispatchBefore, gte: staleAfter },
    },
    select: { id: true },
    orderBy: { scheduledDate: "asc" },
  });

  let assigned = 0;
  for (const order of due) {
    const updated = await prisma.order.updateMany({
      where: { id: order.id, status: { in: ["PENDING", "PREPARING"] } },
      data: { status: "READY_FOR_PICKUP" },
    });
    if (updated.count === 0) {
      continue;
    }
    const result = await runAutoAssign({ orderId: order.id });
    assigned += result.assignedCount;
  }

  if (toPrepare.length > 0 || due.length > 0) {
    publishDispatchEvent({ type: "orders.changed" });
  }

  return {
    prepared: toPrepare.length,
    dispatched: due.length,
    assigned,
  };
}
