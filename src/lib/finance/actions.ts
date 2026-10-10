"use server";

import { revalidatePath } from "next/cache";

import { isSuperAdminRole } from "@/lib/auth/constants";
import { readSession } from "@/lib/auth/server";
import { ensureFinanceSchema } from "@/lib/finance/ensure-schema";
import {
  getFinanceConfig,
  getFinanceDashboardSnapshot,
  markDriverDepositPaid,
  refundDriverDeposit,
  resolveDispute,
  updateFinanceConfig,
} from "@/lib/finance/service";
import {
  normalizeFinanceConfig,
  type DeliveryProofMode,
  type PlatformFinanceConfig,
} from "@/lib/finance/types";
import { prisma } from "@/lib/db";

async function requireAdmin(): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await readSession();
  if (!session || !isSuperAdminRole(session.role)) {
    return { ok: false, error: "unauthorized" };
  }
  return { ok: true };
}

export async function saveFinanceConfigAction(
  formData: FormData,
): Promise<{ ok: boolean; error?: string; config?: PlatformFinanceConfig }> {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return gate;
  }

  try {
    await ensureFinanceSchema();
    const proof = String(formData.get("deliveryProofMode") ?? "OTP") as DeliveryProofMode;
    const config = await updateFinanceConfig({
      driverSecurityDeposit: Number(formData.get("driverSecurityDeposit")),
      driverCashLimit: Number(formData.get("driverCashLimit")),
      riskBufferPercentage: Number(formData.get("riskBufferPercentage")),
      defaultStoreCommissionPercentage: Number(
        formData.get("defaultStoreCommissionPercentage"),
      ),
      deliveryProofMode: proof,
    });
    revalidatePath("/admin/finance");
    return { ok: true, config };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to save finance config.",
    };
  }
}

export async function updateStoreCommissionAction(
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return gate;
  }

  const storeId = String(formData.get("storeId") ?? "");
  const percentage = Number(formData.get("commissionPercentage"));
  if (!storeId || !Number.isFinite(percentage)) {
    return { ok: false, error: "invalid" };
  }

  try {
    await ensureFinanceSchema();
    const finance = normalizeFinanceConfig(await getFinanceConfig());
    const value = Math.min(100, Math.max(0, Math.round(percentage * 100) / 100));
    await prisma.store.update({
      where: { id: storeId },
      data: { commissionPercentage: value || finance.defaultStoreCommissionPercentage },
    });
    revalidatePath("/admin/finance");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to update commission.",
    };
  }
}

export async function resolveOrderDisputeAction(
  formData: FormData,
): Promise<{ ok: boolean; error?: string; disputeId?: string }> {
  const session = await readSession();
  if (!session || !isSuperAdminRole(session.role)) {
    return { ok: false, error: "unauthorized" };
  }

  const orderId = String(formData.get("orderId") ?? "");
  const faultParty = String(formData.get("faultParty") ?? "") as
    | "DRIVER"
    | "STORE"
    | "PLATFORM"
    | "CUSTOMER"
    | "FORCE_MAJEURE";
  const reason = String(formData.get("reason") ?? "").trim();
  const mealCost = Number(formData.get("mealCost") ?? 0);

  if (!orderId || !reason || !faultParty) {
    return { ok: false, error: "invalid" };
  }

  const result = await resolveDispute({
    orderId,
    faultParty,
    reason,
    mealCost,
    createdById: session.sub,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  revalidatePath("/admin/finance");
  return { ok: true, disputeId: result.disputeId };
}

export async function loadFinanceAdminData(): Promise<{
  snapshot: Awaited<ReturnType<typeof getFinanceDashboardSnapshot>>
  stores: Array<{ id: string; name: string; commissionPercentage: number }>
  drivers: Array<{
    id: string
    name: string
    securityDeposit: number
    securityDepositPaidAt: string | null
    securityDepositRefundedAt: string | null
    cashBlockedAt: string | null
  }>
}> {
  await ensureFinanceSchema();
  const [snapshot, stores, driverRows] = await Promise.all([
    getFinanceDashboardSnapshot(),
    prisma.store.findMany({
      where: { active: true },
      select: { id: true, name: true, commissionPercentage: true },
      orderBy: { name: "asc" },
      take: 80,
    }),
    prisma.driver.findMany({
      select: {
        id: true,
        securityDeposit: true,
        securityDepositPaidAt: true,
        securityDepositRefundedAt: true,
        cashBlockedAt: true,
        user: { select: { name: true } },
      },
      orderBy: { user: { name: "asc" } },
      take: 80,
    }),
  ]);
  return {
    snapshot,
    stores,
    drivers: driverRows.map((row) => ({
      id: row.id,
      name: row.user.name,
      securityDeposit: row.securityDeposit,
      securityDepositPaidAt: row.securityDepositPaidAt?.toISOString() ?? null,
      securityDepositRefundedAt: row.securityDepositRefundedAt?.toISOString() ?? null,
      cashBlockedAt: row.cashBlockedAt?.toISOString() ?? null,
    })),
  };
}

export async function markDriverDepositPaidAction(
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return gate;
  }
  const driverId = String(formData.get("driverId") ?? "");
  if (!driverId) {
    return { ok: false, error: "invalid" };
  }
  try {
    await markDriverDepositPaid(driverId);
    revalidatePath("/admin/finance");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "deposit-failed",
    };
  }
}

export async function refundDriverDepositAction(
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return gate;
  }
  const driverId = String(formData.get("driverId") ?? "");
  if (!driverId) {
    return { ok: false, error: "invalid" };
  }
  try {
    await refundDriverDeposit(driverId);
    revalidatePath("/admin/finance");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "refund-failed",
    };
  }
}
