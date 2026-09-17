"use server";

import { revalidatePath } from "next/cache";

import { SUPER_ADMIN_ROLES, VENDOR_ROLES } from "@/lib/auth/constants";
import { isSession, requireRoles } from "@/lib/auth/server";
import { assertStoreOwnedBy, setStoreAcceptingOrders, updateStoreReceiptFooter } from "@/lib/stores/service";

export interface VendorSettingsResult {
  ok: boolean;
  error?: string;
  receiptFooterNote?: string;
}

function asString(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

function fail(error: unknown): VendorSettingsResult {
  return { ok: false, error: error instanceof Error ? error.message : "Request failed." };
}

export async function toggleVendorStoreActiveAction(
  formData: FormData,
): Promise<VendorSettingsResult & { active?: boolean }> {
  const storeId = asString(formData, "storeId");
  const session = await requireRoles([...VENDOR_ROLES, ...SUPER_ADMIN_ROLES]);
  if (!isSession(session)) {
    return { ok: false, error: "Unauthorized." };
  }
  try {
    if (!SUPER_ADMIN_ROLES.includes(session.role)) {
      await assertStoreOwnedBy(storeId, session.sub);
    }
    const next = asString(formData, "active") === "1";
    const active = await setStoreAcceptingOrders(storeId, next);
    for (const path of ["/vendor/dashboard", "/vendor/orders", "/vendor/settings", "/menu"]) {
      revalidatePath(path);
      revalidatePath(`/ar${path}`);
      revalidatePath(`/en${path}`);
    }
    return { ok: true, active };
  } catch (error) {
    return fail(error);
  }
}

export async function saveVendorReceiptFooterAction(
  formData: FormData,
): Promise<VendorSettingsResult> {
  const storeId = asString(formData, "storeId");
  const session = await requireRoles([...VENDOR_ROLES, ...SUPER_ADMIN_ROLES]);
  if (!isSession(session)) {
    return { ok: false, error: "Unauthorized." };
  }
  try {
    if (!SUPER_ADMIN_ROLES.includes(session.role)) {
      await assertStoreOwnedBy(storeId, session.sub);
    }
    const receiptFooterNote = await updateStoreReceiptFooter(
      storeId,
      asString(formData, "receiptFooterNote"),
    );
    for (const path of ["/vendor/settings", "/vendor/orders"]) {
      revalidatePath(path);
      revalidatePath(`/ar${path}`);
      revalidatePath(`/en${path}`);
    }
    return { ok: true, receiptFooterNote };
  } catch (error) {
    return fail(error);
  }
}
