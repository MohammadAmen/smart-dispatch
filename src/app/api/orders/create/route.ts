import { readPhoneSessionUser } from "@/lib/auth/customer-profile";
import { appendMenuTrackToken } from "@/lib/stores/menu-track-cookie";
import { placeMenuOrder } from "@/lib/stores/menu";
import {
  buildOrderFingerprint,
  claimOrderIdempotency,
  completeOrderIdempotency,
  findRecentDuplicatePlacement,
  releaseOrderIdempotency,
} from "@/lib/stores/order-idempotency";

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

function readIdempotencyKey(request: Request, record: Record<string, unknown>): string | null {
  const header = request.headers.get("idempotency-key")?.trim();
  if (header) {
    return header;
  }
  return typeof record.idempotencyKey === "string" ? record.idempotencyKey.trim() : null;
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

  const sessionUser = await readPhoneSessionUser();
  if (!sessionUser) {
    return Response.json({ ok: false, error: "Sign in with your mobile number first." }, { status: 401 });
  }

  const addressText = typeof record.addressText === "string" ? record.addressText : "";
  const fulfillment = record.fulfillment === "DINE_IN" ? "DINE_IN" : "DELIVERY";
  const tableId = typeof record.tableId === "string" ? record.tableId : null;
  const fingerprint = buildOrderFingerprint({
    customerId: sessionUser.id,
    addressText,
    fulfillment,
    tableId,
    items,
  });

  // Soft window: identical cart within ~90s → replay prior success.
  const softHit = await findRecentDuplicatePlacement(sessionUser.id, fingerprint);
  if (softHit) {
    await appendMenuTrackToken(softHit.trackingToken);
    return Response.json({
      ok: true,
      orderNumber: softHit.orderNumber,
      trackingToken: softHit.trackingToken,
      deliveryFee: softHit.deliveryFee,
      duplicate: true,
    });
  }

  let claimedKey: string | null = null;
  try {
    const claim = await claimOrderIdempotency({
      key: readIdempotencyKey(request, record),
      customerId: sessionUser.id,
      fingerprint,
    });
    if (claim.kind === "replay") {
      await appendMenuTrackToken(claim.result.trackingToken);
      return Response.json({
        ok: true,
        orderNumber: claim.result.orderNumber,
        trackingToken: claim.result.trackingToken,
        deliveryFee: claim.result.deliveryFee,
        duplicate: true,
      });
    }
    if (claim.kind === "busy") {
      return Response.json(
        { ok: false, error: "Order is already being placed. Please wait a moment." },
        { status: 409 },
      );
    }
    claimedKey = claim.key;

    const result = await placeMenuOrder({
      phone: sessionUser.phone,
      addressText,
      items,
      latitude: asCoord(record.latitude),
      longitude: asCoord(record.longitude),
      storeNotes: asNotes(record.storeNotes),
      fulfillment,
      tableId,
      tableLabel: typeof record.tableLabel === "string" ? record.tableLabel : null,
      guestName:
        typeof record.guestName === "string" && record.guestName.trim()
          ? record.guestName
          : sessionUser.name,
    });

    await completeOrderIdempotency(claimedKey, result);

    await appendMenuTrackToken(result.trackingToken);
    return Response.json({
      ok: true,
      orderNumber: result.orderNumber,
      trackingToken: result.trackingToken,
      deliveryFee: result.deliveryFee,
    });
  } catch (error) {
    if (claimedKey) {
      await releaseOrderIdempotency(claimedKey).catch(() => undefined);
    }
    const message = error instanceof Error ? error.message : "Could not place the order.";
    return Response.json({ ok: false, error: message }, { status: 400 });
  }
}
