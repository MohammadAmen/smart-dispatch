import { appendMenuTrackToken } from "@/lib/stores/menu-track-cookie";
import { placeMenuOrder } from "@/lib/stores/menu";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  return value as Record<string, unknown>;
}

function asItems(value: unknown): Array<{
  productId: string;
  quantity: number;
  optionValueIds?: string[];
  note?: string;
}> {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((entry) => {
    if (typeof entry !== "object" || entry === null) {
      return [];
    }
    const row = entry as Record<string, unknown>;
    if (typeof row.productId !== "string") {
      return [];
    }
    const quantity = typeof row.quantity === "number" ? row.quantity : Number(row.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return [];
    }
    const optionValueIds = Array.isArray(row.optionValueIds)
      ? row.optionValueIds.filter((item): item is string => typeof item === "string")
      : [];
    return [
      {
        productId: row.productId,
        quantity: Math.min(99, Math.round(quantity)),
        optionValueIds,
        note: typeof row.note === "string" ? row.note : "",
      },
    ];
  });
}

function asNotes(value: unknown): Record<string, string> {
  if (typeof value !== "object" || value === null) {
    return {};
  }
  const notes: Record<string, string> = {};
  for (const [key, note] of Object.entries(value as Record<string, unknown>)) {
    if (typeof note === "string" && note.trim()) {
      notes[key] = note.trim().slice(0, 500);
    }
  }
  return notes;
}

function asCoord(value: unknown): number | null {
  const numeric = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(numeric) ? numeric : null;
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const record = asRecord(body);
  if (!record) {
    return Response.json({ ok: false, error: "Invalid payload." }, { status: 400 });
  }

  const items = asItems(record.items);
  if (items.length === 0) {
    return Response.json({ ok: false, error: "Select at least one product." }, { status: 400 });
  }

  try {
    const result = await placeMenuOrder({
      phone: typeof record.phone === "string" ? record.phone : "",
      addressText: typeof record.addressText === "string" ? record.addressText : "",
      items,
      latitude: asCoord(record.latitude),
      longitude: asCoord(record.longitude),
      storeNotes: asNotes(record.storeNotes),
      fulfillment: record.fulfillment === "DINE_IN" ? "DINE_IN" : "DELIVERY",
      tableId: typeof record.tableId === "string" ? record.tableId : null,
      tableLabel: typeof record.tableLabel === "string" ? record.tableLabel : null,
      guestName: typeof record.guestName === "string" ? record.guestName : null,
    });
    await appendMenuTrackToken(result.trackingToken);
    return Response.json({
      ok: true,
      orderNumber: result.orderNumber,
      trackingToken: result.trackingToken,
      deliveryFee: result.deliveryFee,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not place the order.";
    return Response.json({ ok: false, error: message }, { status: 400 });
  }
}
