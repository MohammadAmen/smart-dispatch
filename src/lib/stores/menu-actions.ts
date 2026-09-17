"use server";

import { revalidatePath } from "next/cache";

import { asFiniteNumber } from "@/lib/http";
import { placeMenuOrder } from "@/lib/stores/menu";
import { appendMenuTrackToken } from "@/lib/stores/menu-track-cookie";

function parseCartItems(rawItems: FormDataEntryValue | null): Array<{
  productId: string;
  quantity: number;
  optionValueIds?: string[];
  note?: string;
}> {
  if (typeof rawItems !== "string" || rawItems.length === 0) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(rawItems);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.flatMap((entry) => {
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
  } catch {
    return [];
  }
}

function parseStoreNotes(rawNotes: FormDataEntryValue | null): Record<string, string> {
  if (typeof rawNotes !== "string" || rawNotes.length === 0) {
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(rawNotes);
    if (typeof parsed !== "object" || parsed === null) {
      return {};
    }
    const notes: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === "string" && value.trim()) {
        notes[key] = value.trim().slice(0, 500);
      }
    }
    return notes;
  } catch {
    return {};
  }
}

export async function placeMenuOrderAction(
  formData: FormData,
): Promise<
  | { ok: true; orderNumber: string; trackingToken: string; deliveryFee: number }
  | { ok: false; error: string }
> {
  const items = parseCartItems(formData.get("items"));
  if (items.length === 0) {
    return { ok: false, error: "Invalid cart payload." };
  }

  try {
    const result = await placeMenuOrder({
      phone: String(formData.get("phone") ?? ""),
      storeId: String(formData.get("storeId") ?? "") || undefined,
      addressText: String(formData.get("addressText") ?? ""),
      items,
      latitude: asFiniteNumber(formData.get("latitude")),
      longitude: asFiniteNumber(formData.get("longitude")),
      storeNotes: parseStoreNotes(formData.get("storeNotes")),
    });
    revalidatePath("/orders");
    revalidatePath("/dashboard");
    revalidatePath("/vendor/orders");
    revalidatePath("/menu/orders");
    await appendMenuTrackToken(result.trackingToken);
    return {
      ok: true,
      orderNumber: result.orderNumber,
      trackingToken: result.trackingToken,
      deliveryFee: result.deliveryFee,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not place the order.",
    };
  }
}
