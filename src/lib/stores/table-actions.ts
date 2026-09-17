"use server";

import { revalidatePath } from "next/cache";

import { SUPER_ADMIN_ROLES, VENDOR_ROLES } from "@/lib/auth/constants";
import { isSession, requireRoles } from "@/lib/auth/server";
import { assertStoreOwnedBy } from "@/lib/stores/service";
import { createStoreTable, deleteStoreTable, updateStoreTable } from "@/lib/stores/store-tables";

export interface TableActionResult {
  ok: boolean;
  error?: string;
}

function asString(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

function fail(error: unknown): TableActionResult {
  return { ok: false, error: error instanceof Error ? error.message : "Request failed." };
}

function revalidateTables(): void {
  for (const path of ["/vendor/tables", "/vendor/dashboard"]) {
    revalidatePath(path);
    revalidatePath(`/ar${path}`);
    revalidatePath(`/en${path}`);
  }
}

async function requireVendorStore(storeId: string): Promise<TableActionResult | { ownerId: string }> {
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

export async function saveTableAction(formData: FormData): Promise<TableActionResult> {
  const storeId = asString(formData, "storeId");
  const access = await requireVendorStore(storeId);
  if ("ok" in access) {
    return access;
  }
  try {
    const id = asString(formData, "id").trim();
    const name = asString(formData, "name");
    const capacity = Number.parseInt(asString(formData, "capacity"), 10);
    const kind = asString(formData, "kind") === "STAND" ? "STAND" : "TABLE";
    if (id) {
      await updateStoreTable(storeId, id, { name, capacity });
    } else {
      await createStoreTable(storeId, { name, capacity, kind });
    }
    revalidateTables();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteTableAction(formData: FormData): Promise<TableActionResult> {
  const storeId = asString(formData, "storeId");
  const access = await requireVendorStore(storeId);
  if ("ok" in access) {
    return access;
  }
  try {
    await deleteStoreTable(storeId, asString(formData, "id"));
    revalidateTables();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}
