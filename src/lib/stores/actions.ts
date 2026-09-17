"use server";

import { revalidatePath } from "next/cache";

import { SUPER_ADMIN_ROLES, VENDOR_ROLES } from "@/lib/auth/constants";
import { isSession, requireRoles } from "@/lib/auth/server";
import { asFiniteNumber } from "@/lib/http";
import { isImageFile, saveOfferImage, saveProductImage, saveStoreImage } from "@/lib/stores/product-image";
import {
  createStoreType,
  deleteStoreType,
  updateStoreType,
} from "@/lib/stores/store-types";
import {
  assertStoreOwnedBy,
  createCategory,
  createProduct,
  createStore,
  createStoreDriver,
  createStoreOwner,
  deleteCategory,
  deleteProduct,
  deleteStore,
  setProductAvailability,
  updateCategory,
  updateProduct,
  updateStore,
} from "@/lib/stores/service";
import { createOffer, deleteOffer, expireDueOffers, updateOffer } from "@/lib/stores/offers";
import { isOfferDiscountType, type OfferRecord } from "@/lib/stores/offer-types";
import type { VendorOrderRecord } from "@/lib/stores/order-types";
import {
  advanceVendorOrderStatus,
  cancelVendorOrder,
  listStoreOrders,
  listStoreOrdersPage,
  listVendorOrderAlerts,
} from "@/lib/stores/vendor-orders";
import {
  parseVendorOrderPage,
  parseVendorOrderSource,
  parseVendorOrderStatus,
} from "@/lib/stores/vendor-order-query";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

function asString(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

function asOptional(form: FormData, key: string): string | null {
  const value = asString(form, key).trim();
  return value.length > 0 ? value : null;
}

function asBoolean(form: FormData, key: string): boolean {
  const value = form.get(key);
  return value === "on" || value === "true" || value === "1";
}

function asNumber(form: FormData, key: string): number {
  return Number.parseFloat(asString(form, key));
}

function asFile(form: FormData, key: string): File | null {
  const value = form.get(key);
  return isImageFile(value) ? value : null;
}

function revalidateVendor(): void {
  const paths = [
    "/vendor/dashboard",
    "/vendor/categories",
    "/vendor/products",
    "/vendor/orders",
    "/vendor/offers",
    "/menu",
    "/menu/orders",
    "/menu/stores",
  ];
  for (const path of paths) {
    revalidatePath(path);
    revalidatePath(`/ar${path}`);
    revalidatePath(`/en${path}`);
  }
}

function fail(error: unknown): ActionResult {
  return {
    ok: false,
    error: error instanceof Error ? error.message : "Request failed.",
  };
}

async function requireAdmin(): Promise<ActionResult | null> {
  const session = await requireRoles(SUPER_ADMIN_ROLES);
  if (!isSession(session)) {
    return { ok: false, error: "Unauthorized." };
  }
  return null;
}

async function requireVendorStore(storeId: string): Promise<ActionResult | { ownerId: string }> {
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

export async function saveStoreAction(formData: FormData): Promise<ActionResult> {
  const denied = await requireAdmin();
  if (denied) {
    return denied;
  }

  const storeTypeId = asString(formData, "storeTypeId").trim();
  if (!storeTypeId) {
    return { ok: false, error: "Store type is required." };
  }

  try {
    const uploadedLogo = asFile(formData, "logo");
    const uploadedCover = asFile(formData, "cover");
    const logoUrl = uploadedLogo ? await saveStoreImage(uploadedLogo) : asOptional(formData, "logoUrl");
    const coverImage = uploadedCover
      ? await saveStoreImage(uploadedCover)
      : asOptional(formData, "coverImage");
    const payload = {
      name: asString(formData, "name"),
      storeTypeId,
      phone: asOptional(formData, "phone"),
      address: asOptional(formData, "address"),
      city: asOptional(formData, "city"),
      logoUrl,
      coverImage,
      latitude: asFiniteNumber(formData.get("latitude")),
      longitude: asFiniteNumber(formData.get("longitude")),
      rating: asNumber(formData, "rating"),
      active: asBoolean(formData, "active"),
      ownerId: asOptional(formData, "ownerId"),
    };
    const id = asOptional(formData, "id");
    if (id) {
      await updateStore(id, payload);
    } else {
      await createStore(payload);
    }
    revalidatePath("/admin/stores");
    revalidatePath("/admin/store-types");
    revalidatePath("/menu");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteStoreAction(formData: FormData): Promise<ActionResult> {
  const denied = await requireAdmin();
  if (denied) {
    return denied;
  }

  try {
    await deleteStore(asString(formData, "id"));
    revalidatePath("/admin/stores");
    revalidatePath("/menu");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function saveStoreTypeAction(formData: FormData): Promise<ActionResult> {
  const denied = await requireAdmin();
  if (denied) {
    return denied;
  }

  try {
    const payload = {
      name: asString(formData, "name"),
      icon: asString(formData, "icon"),
      sortOrder: Number.parseInt(asString(formData, "sortOrder") || "0", 10),
    };
    const id = asOptional(formData, "id");
    if (id) {
      await updateStoreType(id, payload);
    } else {
      await createStoreType(payload);
    }
    revalidatePath("/admin/stores");
    revalidatePath("/admin/store-types");
    revalidatePath("/menu");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteStoreTypeAction(formData: FormData): Promise<ActionResult> {
  const denied = await requireAdmin();
  if (denied) {
    return denied;
  }

  try {
    await deleteStoreType(asString(formData, "id"));
    revalidatePath("/admin/stores");
    revalidatePath("/admin/store-types");
    revalidatePath("/menu");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function createOwnerAction(formData: FormData): Promise<ActionResult> {
  const denied = await requireAdmin();
  if (denied) {
    return denied;
  }

  try {
    await createStoreOwner({
      name: asString(formData, "name"),
      email: asString(formData, "email"),
      phone: asString(formData, "phone"),
      password: asOptional(formData, "password") ?? undefined,
    });
    revalidatePath("/admin/stores");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function createDriverAction(formData: FormData): Promise<ActionResult> {
  const denied = await requireAdmin();
  if (denied) {
    return denied;
  }

  try {
    await createStoreDriver({
      name: asString(formData, "name"),
      email: asString(formData, "email"),
      phone: asString(formData, "phone"),
      vehicleType: asOptional(formData, "vehicleType") ?? undefined,
      password: asOptional(formData, "password") ?? undefined,
    });
    revalidatePath("/admin/stores");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function saveCategoryAction(formData: FormData): Promise<ActionResult> {
  const storeId = asString(formData, "storeId");
  const access = await requireVendorStore(storeId);
  if ("ok" in access) {
    return access;
  }

  try {
    const payload = {
      name: asString(formData, "name"),
      sortOrder: Number.parseInt(asString(formData, "sortOrder") || "0", 10),
      active: asBoolean(formData, "active"),
    };
    const id = asOptional(formData, "id");
    if (id) {
      await updateCategory(storeId, id, payload);
    } else {
      await createCategory(storeId, payload);
    }
    revalidateVendor();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteCategoryAction(formData: FormData): Promise<ActionResult> {
  const storeId = asString(formData, "storeId");
  const access = await requireVendorStore(storeId);
  if ("ok" in access) {
    return access;
  }

  try {
    await deleteCategory(storeId, asString(formData, "id"));
    revalidateVendor();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function saveProductAction(formData: FormData): Promise<ActionResult> {
  const storeId = asString(formData, "storeId");
  const access = await requireVendorStore(storeId);
  if ("ok" in access) {
    return access;
  }

  try {
    const kept = formData
      .getAll("keptImage")
      .flatMap((value) => (typeof value === "string" && value.trim() ? [value.trim()] : []));
    const uploaded = formData.getAll("images").filter(isImageFile);
    const saved = await Promise.all(uploaded.map((file) => saveProductImage(file)));
    const images = [...kept, ...saved];
    const payload = {
      categoryId: asString(formData, "categoryId"),
      name: asString(formData, "name"),
      description: asString(formData, "description"),
      price: asNumber(formData, "price"),
      hasDiscount: asBoolean(formData, "hasDiscount"),
      discountPrice: Number.parseFloat(asString(formData, "discountPrice")),
      imageUrl: images[0] ?? null,
      images,
      available: asBoolean(formData, "available"),
      sortOrder: Number.parseInt(asString(formData, "sortOrder") || "0", 10),
    };
    const id = asOptional(formData, "id");
    const product = id
      ? await updateProduct(storeId, id, payload)
      : await createProduct(storeId, payload);
    const { parseOptionGroupsJson, replaceProductOptionGroups } = await import(
      "@/lib/stores/product-options-store"
    );
    await replaceProductOptionGroups(product.id, parseOptionGroupsJson(asString(formData, "optionGroups")));
    revalidateVendor();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function toggleProductAvailabilityAction(formData: FormData): Promise<ActionResult> {
  const storeId = asString(formData, "storeId");
  const access = await requireVendorStore(storeId);
  if ("ok" in access) {
    return access;
  }

  try {
    await setProductAvailability(storeId, asString(formData, "id"), asBoolean(formData, "available"));
    revalidateVendor();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteProductAction(formData: FormData): Promise<ActionResult> {
  const storeId = asString(formData, "storeId");
  const access = await requireVendorStore(storeId);
  if ("ok" in access) {
    return access;
  }

  try {
    await deleteProduct(storeId, asString(formData, "id"));
    revalidateVendor();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function advanceVendorOrderAction(formData: FormData): Promise<ActionResult> {
  const storeId = asString(formData, "storeId");
  const access = await requireVendorStore(storeId);
  if ("ok" in access) {
    return access;
  }

  try {
    await advanceVendorOrderStatus(storeId, asString(formData, "id"));
    revalidateVendor();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function quoteCustomOrderAction(formData: FormData): Promise<ActionResult> {
  const storeId = asString(formData, "storeId");
  const access = await requireVendorStore(storeId);
  if ("ok" in access) {
    return access;
  }

  try {
    const { quoteCustomOrder } = await import("@/lib/stores/custom-order-service");
    await quoteCustomOrder(storeId, asString(formData, "id"), asNumber(formData, "quotedPrice"));
    revalidateVendor();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function cancelVendorOrderAction(formData: FormData): Promise<ActionResult> {
  const storeId = asString(formData, "storeId");
  const access = await requireVendorStore(storeId);
  if ("ok" in access) {
    return access;
  }

  try {
    await cancelVendorOrder(storeId, asString(formData, "id"), asString(formData, "reason"));
    revalidateVendor();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function listVendorOrdersAction(
  storeId: string,
): Promise<{ ok: true; orders: VendorOrderRecord[] } | { ok: false; error: string }> {
  const access = await requireVendorStore(storeId);
  if ("ok" in access) {
    return { ok: false, error: access.error ?? "Unauthorized." };
  }

  try {
    return { ok: true, orders: await listStoreOrders(storeId) };
  } catch (error) {
    const result = fail(error);
    return { ok: false, error: result.error ?? "Failed to load orders." };
  }
}

export async function listVendorOrdersPageAction(
  storeId: string,
  query?: { page?: string; status?: string; orderSource?: string },
): Promise<
  | { ok: true; result: Awaited<ReturnType<typeof listStoreOrdersPage>> }
  | { ok: false; error: string }
> {
  const access = await requireVendorStore(storeId);
  if ("ok" in access) {
    return { ok: false, error: access.error ?? "Unauthorized." };
  }

  try {
    return {
      ok: true,
      result: await listStoreOrdersPage({
        storeId,
        page: parseVendorOrderPage(query?.page),
        status: parseVendorOrderStatus(query?.status),
        orderSource: parseVendorOrderSource(query?.orderSource),
      }),
    };
  } catch (error) {
    const result = fail(error);
    return { ok: false, error: result.error ?? "Failed to load orders." };
  }
}

export async function listVendorOrderAlertsAction(
  storeId: string,
): Promise<
  | { ok: true; pending: Awaited<ReturnType<typeof listVendorOrderAlerts>> }
  | { ok: false; error: string }
> {
  const access = await requireVendorStore(storeId);
  if ("ok" in access) {
    return { ok: false, error: access.error ?? "Unauthorized." };
  }

  try {
    return { ok: true, pending: await listVendorOrderAlerts(storeId) };
  } catch (error) {
    const result = fail(error);
    return { ok: false, error: result.error ?? "Failed to load orders." };
  }
}

export async function saveOfferAction(formData: FormData): Promise<ActionResult> {
  const storeId = asString(formData, "storeId");
  const access = await requireVendorStore(storeId);
  if ("ok" in access) {
    return access;
  }

  try {
    const uploaded = asFile(formData, "image");
    const image = uploaded ? await saveOfferImage(uploaded) : asOptional(formData, "imageUrl");
    const durationMode = asString(formData, "durationMode");
    const now = new Date();
    let startDate = parseDateTime(asString(formData, "startDate")) ?? now;
    let endDate = parseDateTime(asString(formData, "endDate"));

    if (durationMode !== "exact") {
      const minutes = Math.max(1, Math.round(asNumber(formData, "durationMinutes") || 180));
      startDate = now;
      endDate = new Date(now.getTime() + minutes * 60_000);
    }

    if (!endDate) {
      return { ok: false, error: "Offer end time is required." };
    }

    const rawType = asString(formData, "discountType");
    const discountType = isOfferDiscountType(rawType) ? rawType : "PERCENT";
    const payload = {
      title: asString(formData, "title"),
      description: asString(formData, "description"),
      image,
      startDate,
      endDate,
      isActive: asBoolean(formData, "active"),
      categoryId: asOptional(formData, "categoryId"),
      productId: asOptional(formData, "productId"),
      discountType,
      discountVal: asNumber(formData, "discountVal"),
    };

    const id = asOptional(formData, "id");
    if (id) {
      await updateOffer(storeId, id, payload);
    } else {
      await createOffer(storeId, payload);
    }
    revalidateVendor();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteOfferAction(formData: FormData): Promise<ActionResult> {
  const storeId = asString(formData, "storeId");
  const access = await requireVendorStore(storeId);
  if ("ok" in access) {
    return access;
  }

  try {
    await deleteOffer(storeId, asString(formData, "id"));
    revalidateVendor();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function expireOffersAction(
  storeId: string,
): Promise<{ ok: true; expired: OfferRecord[] } | { ok: false; error: string }> {
  const access = await requireVendorStore(storeId);
  if ("ok" in access) {
    return { ok: false, error: access.error ?? "Unauthorized." };
  }

  try {
    return { ok: true, expired: await expireDueOffers(storeId) };
  } catch (error) {
    const result = fail(error);
    return { ok: false, error: result.error ?? "Failed to expire offers." };
  }
}

function parseDateTime(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
