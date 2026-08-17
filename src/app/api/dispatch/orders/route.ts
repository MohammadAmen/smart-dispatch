import { bootstrapDispatchData, listOrdersWithDrivers } from "@/lib/dispatch/bootstrap";
import { emptyStatusCounts, toLiveOrder } from "@/lib/dispatch/order-mapper";
import type { DispatchOrdersResponse } from "@/lib/dispatch/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    await bootstrapDispatchData();
    const rows = await listOrdersWithDrivers();
    const counts = emptyStatusCounts();

    const orders = rows.map((row) => {
      counts[row.status] += 1;
      return toLiveOrder(row);
    });

    return Response.json({
      ok: true,
      orders,
      counts,
    } satisfies DispatchOrdersResponse);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load orders.";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
