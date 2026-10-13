"use server";

import { revalidatePath } from "next/cache";

import { isSuperAdminRole, VENDOR_ROLES } from "@/lib/auth/constants";
import { readSession } from "@/lib/auth/server";
import {
  getCompanyProfile,
  updateCompanyProfile,
  type CompanyProfile,
} from "@/lib/finance/company-profile";
import { ensureFinanceSchema } from "@/lib/finance/ensure-schema";
import {
  getStorePayoutSettlement,
  getVendorPayoutSummary,
  listStorePayoutDues,
  listStorePayoutSettlements,
  settleStorePayout,
  type StorePayoutDueRow,
  type StorePayoutSettlementView,
} from "@/lib/finance/payouts";
import { prisma } from "@/lib/db";
import { isImageFile, saveUploadedImage } from "@/lib/stores/product-image";

function revalidatePayoutPaths(storeId?: string): void {
  revalidatePath("/admin/payouts");
  revalidatePath("/admin/company");
  revalidatePath("/admin/finance");
  revalidatePath("/vendor/payouts");
  revalidatePath("/ar/vendor/payouts");
  revalidatePath("/en/vendor/payouts");
  if (storeId) {
    revalidatePath(`/admin/payouts/${storeId}`);
  }
}

export async function loadAdminPayoutsData(): Promise<{
  dues: StorePayoutDueRow[]
  settlements: StorePayoutSettlementView[]
  company: CompanyProfile
}> {
  await ensureFinanceSchema();
  const [dues, settlements, company] = await Promise.all([
    listStorePayoutDues(),
    listStorePayoutSettlements({ take: 30 }),
    getCompanyProfile(),
  ]);
  return { dues, settlements, company };
}

export async function settleStorePayoutAction(
  formData: FormData,
): Promise<{
  ok: boolean
  error?: string
  settlementId?: string
  settlement?: StorePayoutSettlementView
}> {
  const session = await readSession();
  if (!session || !isSuperAdminRole(session.role)) {
    return { ok: false, error: "unauthorized" };
  }

  const storeId = String(formData.get("storeId") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  if (!storeId) {
    return { ok: false, error: "invalid" };
  }

  try {
    await ensureFinanceSchema();
    const settlement = await settleStorePayout({
      storeId,
      note: note || null,
      settledById: session.sub,
    });
    revalidatePayoutPaths(storeId);
    return { ok: true, settlementId: settlement.id, settlement };
  } catch (error) {
    const code = error instanceof Error ? error.message : "settle-failed";
    const known = new Set([
      "unauthorized",
      "invalid",
      "no-pending-payouts",
      "store-not-found",
      "settle-race",
      "settle-conflict",
      "settle-fk",
      "schema-not-ready",
      "settle-failed",
      "settlement-not-found",
    ]);
    return {
      ok: false,
      error: known.has(code) ? code : "settle-failed",
    };
  }
}

export async function loadSettlementAction(
  settlementId: string,
): Promise<{ ok: true; settlement: StorePayoutSettlementView; company: CompanyProfile } | { ok: false; error: string }> {
  const session = await readSession();
  if (!session) {
    return { ok: false, error: "unauthorized" };
  }

  try {
    const settlement = await getStorePayoutSettlement(settlementId);
    if (!isSuperAdminRole(session.role)) {
      if (!VENDOR_ROLES.includes(session.role as (typeof VENDOR_ROLES)[number])) {
        return { ok: false, error: "unauthorized" };
      }
      const owned = await prisma.store.findFirst({
        where: { id: settlement.storeId, ownerId: session.sub },
        select: { id: true },
      });
      if (!owned) {
        return { ok: false, error: "unauthorized" };
      }
    }
    const company = await getCompanyProfile();
    return { ok: true, settlement, company };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "not-found",
    };
  }
}

export async function saveCompanyProfileAction(
  formData: FormData,
): Promise<{ ok: boolean; error?: string; company?: CompanyProfile }> {
  const session = await readSession();
  if (!session || !isSuperAdminRole(session.role)) {
    return { ok: false, error: "unauthorized" };
  }

  try {
    await ensureFinanceSchema();
    const current = await getCompanyProfile();
    let logoUrl = String(formData.get("logoUrl") ?? current.logoUrl).trim();
    const logoFile = formData.get("logo");
    if (isImageFile(logoFile)) {
      logoUrl = await saveUploadedImage(logoFile, "company");
    }

    const company = await updateCompanyProfile({
      legalName: String(formData.get("legalName") ?? ""),
      tradeName: String(formData.get("tradeName") ?? ""),
      taxId: String(formData.get("taxId") ?? ""),
      registrationNumber: String(formData.get("registrationNumber") ?? ""),
      address: String(formData.get("address") ?? ""),
      city: String(formData.get("city") ?? ""),
      country: String(formData.get("country") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      email: String(formData.get("email") ?? ""),
      website: String(formData.get("website") ?? ""),
      logoUrl,
      invoiceFooter: String(formData.get("invoiceFooter") ?? ""),
      bankName: String(formData.get("bankName") ?? ""),
      bankIban: String(formData.get("bankIban") ?? ""),
      bankAccountName: String(formData.get("bankAccountName") ?? ""),
    });
    revalidatePayoutPaths();
    return { ok: true, company };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "save-failed",
    };
  }
}

export async function loadVendorPayoutsData(storeId: string): Promise<{
  pending: Awaited<ReturnType<typeof getVendorPayoutSummary>>["pending"]
  pendingLines: Awaited<ReturnType<typeof getVendorPayoutSummary>>["pendingLines"]
  settlements: StorePayoutSettlementView[]
  company: CompanyProfile
}> {
  await ensureFinanceSchema();
  const [summary, company] = await Promise.all([
    getVendorPayoutSummary(storeId),
    getCompanyProfile(),
  ]);
  return { ...summary, company };
}
