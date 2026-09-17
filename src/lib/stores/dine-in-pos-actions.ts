"use server";

import { SUPER_ADMIN_ROLES, VENDOR_ROLES } from "@/lib/auth/constants";
import { isSession, requireRoles } from "@/lib/auth/server";
import { addDineInExtraItem, serveAllDineInItems, toggleDineInItem } from "@/lib/stores/dine-in-pos";
import { assertStoreOwnedBy } from "@/lib/stores/service";
import type { VendorOrderRecord } from "@/lib/stores/order-types";

export interface PosActionResult {
  ok: boolean;
  error?: string;
  order?: VendorOrderRecord;
}

function asString(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

function fail(error: unknown): PosActionResult {
  return { ok: false, error: error instanceof Error ? error.message : "Request failed." };
}

async function requireVendorStore(storeId: string): Promise<PosActionResult | { ownerId: string }> {
  const session = await requireRoles([...VENDOR_ROLES, ...SUPER_ADMIN_ROLES]);
  if (!isSession(session)) {
    return { ok: false, error: "Unauthorized." };
  }
  try {
    if (!SUPER_ADMIN_ROLES.includes(session.role)) {
      await assertStoreOwnedBy(storeId, session.sub);
    }
    return { ownerId: session.sub };
  } catch (error) {
    return fail(error);
  }
}

export async function toggleDineInItemAction(formData: FormData): Promise<PosActionResult> {
  const storeId = asString(formData, "storeId");
  const access = await requireVendorStore(storeId);
  if ("ok" in access) {
    return access;
  }
  try {
    const order = await toggleDineInItem(storeId, asString(formData, "orderId"), asString(formData, "itemId"));
    return { ok: true, order };
  } catch (error) {
    return fail(error);
  }
}

export async function serveAllDineInItemsAction(formData: FormData): Promise<PosActionResult> {
  const storeId = asString(formData, "storeId");
  const access = await requireVendorStore(storeId);
  if ("ok" in access) {
    return access;
  }
  try {
    const order = await serveAllDineInItems(storeId, asString(formData, "orderId"));
    return { ok: true, order };
  } catch (error) {
    return fail(error);
  }
}

export async function addDineInExtraItemAction(formData: FormData): Promise<PosActionResult> {
  const storeId = asString(formData, "storeId");
  const access = await requireVendorStore(storeId);
  if ("ok" in access) {
    return access;
  }
  try {
    const priceRaw = asString(formData, "unitPrice");
    const order = await addDineInExtraItem(storeId, asString(formData, "orderId"), {
      productId: asString(formData, "productId") || null,
      name: asString(formData, "name"),
      unitPrice: priceRaw.trim() ? Number.parseFloat(priceRaw) : 0,
      quantity: Number.parseInt(asString(formData, "quantity") || "1", 10),
    });
    return { ok: true, order };
  } catch (error) {
    return fail(error);
  }
}
