import "server-only";

import { prisma } from "@/lib/db";
import { ensureFinanceSchema } from "@/lib/finance/ensure-schema";
import {
  computeOrderFinancial,
  money,
  normalizeFinanceConfig,
  type DeliveryProofMode,
  type PlatformFinanceConfig,
} from "@/lib/finance/types";

function generateDeliveryOtp(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export async function getFinanceConfig(): Promise<PlatformFinanceConfig> {
  await ensureFinanceSchema();
  try {
    const rows = await prisma.$queryRaw<{ financeJson: string | null }[]>`
      SELECT "financeJson" FROM app_config WHERE id = 'default' LIMIT 1
    `;
    const raw = rows[0]?.financeJson;
    if (!raw) {
      return normalizeFinanceConfig(null);
    }
    const parsed = JSON.parse(raw) as Partial<PlatformFinanceConfig>;
    return normalizeFinanceConfig(parsed);
  } catch {
    return normalizeFinanceConfig(null);
  }
}

export async function updateFinanceConfig(
  patch: Partial<PlatformFinanceConfig>,
): Promise<PlatformFinanceConfig> {
  await ensureFinanceSchema();
  const current = await getFinanceConfig();
  const next = normalizeFinanceConfig({ ...current, ...patch });
  const payload = JSON.stringify(next);
  await prisma.$executeRaw`
    UPDATE app_config
    SET "financeJson" = ${payload}, "updatedAt" = CURRENT_TIMESTAMP
    WHERE id = 'default'
  `;
  return next;
}

/**
 * Lock commission + financial snapshot for an order. Idempotent.
 * Never mutates historical rows once locked.
 */
export async function lockOrderFinancial(orderId: string): Promise<void> {
  await ensureFinanceSchema();
  const existing = await prisma.orderFinancial.findUnique({
    where: { orderId },
    select: { id: true },
  });
  if (existing) {
    return;
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      storeId: true,
      deliveryFee: true,
      codAmount: true,
      bundleRole: true,
      items: { select: { unitPrice: true, quantity: true } },
      store: { select: { commissionPercentage: true } },
    },
  });
  if (!order) {
    return;
  }

  // Parent shell carries route fee only — skip empty item shells without store.
  if (order.bundleRole === "PARENT" && order.items.length === 0 && !order.storeId) {
    const finance = await getFinanceConfig();
    const breakdown = computeOrderFinancial({
      itemsSubtotal: 0,
      deliveryFee: order.deliveryFee,
      commissionPercentage: 0,
      riskBufferPercentage: finance.riskBufferPercentage,
    });
    await prisma.orderFinancial.create({
      data: {
        orderId: order.id,
        storeId: null,
        ...breakdown,
      },
    });
    await ensureOrderDeliveryProofCode(order.id);
    return;
  }

  const finance = await getFinanceConfig();
  const itemsSubtotal = money(
    order.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
  );
  const commissionPercentage =
    order.store?.commissionPercentage ?? finance.defaultStoreCommissionPercentage;
  const breakdown = computeOrderFinancial({
    itemsSubtotal,
    deliveryFee: order.deliveryFee,
    commissionPercentage,
    riskBufferPercentage: finance.riskBufferPercentage,
  });

  await prisma.orderFinancial.create({
    data: {
      orderId: order.id,
      storeId: order.storeId,
      ...breakdown,
      // Prefer live COD if already set (bundle parent updates).
      codAmount: money(order.codAmount ?? breakdown.codAmount),
    },
  });
  await ensureOrderDeliveryProofCode(order.id);
}

/** Idempotent OTP seed for delivery confirmation. */
export async function ensureOrderDeliveryProofCode(orderId: string): Promise<string | null> {
  await ensureFinanceSchema();
  try {
    const existing = await prisma.order.findUnique({
      where: { id: orderId },
      select: { deliveryProofCode: true },
    });
    if (existing?.deliveryProofCode) {
      return existing.deliveryProofCode;
    }
    const code = generateDeliveryOtp();
    await prisma.order.update({
      where: { id: orderId },
      data: { deliveryProofCode: code },
    });
    return code;
  } catch {
    return null;
  }
}

export async function getDeliveryProofRequirement(): Promise<DeliveryProofMode> {
  const finance = await getFinanceConfig();
  return finance.deliveryProofMode;
}

/**
 * Validate delivery proof per platform policy.
 * Returns ok when mode is NONE or proof matches.
 */
export async function assertDeliveryProof(input: {
  orderId: string
  otp?: string | null
  photoUrl?: string | null
}): Promise<{ ok: true } | { ok: false; error: string }> {
  await ensureFinanceSchema();
  const mode = await getDeliveryProofRequirement();
  if (mode === "NONE") {
    return { ok: true };
  }

  const order = await prisma.order.findFirst({
    where: { OR: [{ id: input.orderId }, { orderNumber: input.orderId }] },
    select: {
      id: true,
      deliveryProofCode: true,
      deliveryProofVerifiedAt: true,
    },
  });
  if (!order) {
    return { ok: false, error: "order-not-found" };
  }
  if (order.deliveryProofVerifiedAt) {
    return { ok: true };
  }

  const needsOtp = mode === "OTP" || mode === "BOTH";
  const needsPhoto = mode === "PHOTO" || mode === "BOTH";
  const otp = (input.otp ?? "").trim();
  const photoUrl = (input.photoUrl ?? "").trim();

  if (needsOtp) {
    const expected = order.deliveryProofCode ?? (await ensureOrderDeliveryProofCode(order.id));
    if (!expected || otp !== expected) {
      return { ok: false, error: "invalid-otp" };
    }
  }
  if (needsPhoto && photoUrl.length < 8) {
    return { ok: false, error: "photo-required" };
  }

  await prisma.order.update({
    where: { id: order.id },
    data: {
      deliveryProofVerifiedAt: new Date(),
      ...(photoUrl ? { deliveryProofPhotoUrl: photoUrl.slice(0, 2048) } : {}),
    },
  });
  return { ok: true };
}

export async function getDriverHeldCash(driverId: string): Promise<number> {
  await ensureFinanceSchema();
  const pending = await prisma.order.findMany({
    where: {
      driverId,
      status: "DELIVERED",
      cashSettledAt: null,
      bundleRole: { not: "CHILD" },
    },
    select: { codAmount: true },
  });
  return money(pending.reduce((sum, row) => sum + money(row.codAmount), 0));
}

export async function getDriverCashLimit(driverId: string): Promise<number> {
  const finance = await getFinanceConfig();
  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
    select: { cashLimitOverride: true },
  });
  if (driver?.cashLimitOverride != null && Number.isFinite(driver.cashLimitOverride)) {
    return money(driver.cashLimitOverride);
  }
  return finance.driverCashLimit;
}

/**
 * Returns driver IDs eligible for new offers:
 * - under cash ceiling
 * - security deposit paid when a deposit amount is required (> 0)
 */
export async function filterDriversUnderCashLimit(driverIds: string[]): Promise<string[]> {
  if (driverIds.length === 0) {
    return [];
  }
  await ensureFinanceSchema();
  const finance = await getFinanceConfig();
  const drivers = await prisma.driver.findMany({
    where: { id: { in: driverIds } },
    select: {
      id: true,
      cashLimitOverride: true,
      cashBlockedAt: true,
      securityDeposit: true,
      securityDepositPaidAt: true,
    },
  });

  const heldByDriver = await prisma.order.groupBy({
    by: ["driverId"],
    where: {
      driverId: { in: driverIds },
      status: "DELIVERED",
      cashSettledAt: null,
      bundleRole: { not: "CHILD" },
    },
    _sum: { codAmount: true },
  });
  const heldMap = new Map(
    heldByDriver.map((row) => [row.driverId ?? "", money(row._sum.codAmount)]),
  );

  return drivers
    .filter((driver) => {
      // Deposit required only when an amount is configured on the driver row.
      if (
        driver.securityDeposit > 0 &&
        !driver.securityDepositPaidAt
      ) {
        return false;
      }
      const limit =
        driver.cashLimitOverride != null && Number.isFinite(driver.cashLimitOverride)
          ? money(driver.cashLimitOverride)
          : finance.driverCashLimit;
      if (limit <= 0) {
        return true;
      }
      const held = heldMap.get(driver.id) ?? 0;
      return held < limit;
    })
    .map((driver) => driver.id);
}

export async function markDriverDepositPaid(
  driverId: string,
  amount?: number,
): Promise<void> {
  await ensureFinanceSchema();
  const finance = await getFinanceConfig();
  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
    select: { securityDeposit: true, securityDepositPaidAt: true },
  });
  if (!driver) {
    throw new Error("driver-not-found");
  }
  if (driver.securityDepositPaidAt) {
    return;
  }
  const deposit = money(amount ?? (driver.securityDeposit || finance.driverSecurityDeposit));
  await prisma.$transaction(async (tx) => {
    await tx.driver.update({
      where: { id: driverId },
      data: {
        securityDeposit: deposit,
        securityDepositPaidAt: new Date(),
        securityDepositRefundedAt: null,
      },
    });
    await tx.driverWalletLedger.create({
      data: {
        driverId,
        type: "DEPOSIT",
        amount: -deposit,
        note: "تأمين مسترد مدفوع",
      },
    });
  });
}

export async function refundDriverDeposit(driverId: string): Promise<void> {
  await ensureFinanceSchema();
  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
    select: {
      securityDeposit: true,
      securityDepositPaidAt: true,
      securityDepositRefundedAt: true,
    },
  });
  if (!driver?.securityDepositPaidAt || driver.securityDepositRefundedAt) {
    throw new Error("deposit-not-refundable");
  }
  const held = await getDriverHeldCash(driverId);
  if (held > 0) {
    throw new Error("unsettled-cash");
  }
  const deposit = money(driver.securityDeposit);
  await prisma.$transaction(async (tx) => {
    await tx.driver.update({
      where: { id: driverId },
      data: { securityDepositRefundedAt: new Date() },
    });
    if (deposit > 0) {
      await tx.driverWalletLedger.create({
        data: {
          driverId,
          type: "DEPOSIT_REFUND",
          amount: deposit,
          note: "استرداد تأمين 100%",
        },
      });
    }
  });
}

export async function syncDriverCashBlock(driverId: string): Promise<boolean> {
  await ensureFinanceSchema();
  const held = await getDriverHeldCash(driverId);
  const limit = await getDriverCashLimit(driverId);
  const blocked = limit > 0 && held >= limit;
  await prisma.driver.update({
    where: { id: driverId },
    data: { cashBlockedAt: blocked ? new Date() : null },
  });
  return blocked;
}

/** Record delivery earning + cash collected when an order is delivered. Idempotent. */
export async function recordDriverDeliveryLedger(
  orderId: string,
  driverId: string,
): Promise<void> {
  await ensureFinanceSchema();
  const existing = await prisma.driverWalletLedger.findFirst({
    where: { orderId, driverId, type: "CASH_COLLECTED" },
    select: { id: true },
  });
  if (existing) {
    await syncDriverCashBlock(driverId);
    return;
  }

  const financial = await prisma.orderFinancial.findUnique({
    where: { orderId },
    select: { driverEarning: true, codAmount: true },
  });
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { deliveryFee: true, codAmount: true, bundleRole: true },
  });
  if (!order || order.bundleRole === "CHILD") {
    return;
  }

  const earning = money(financial?.driverEarning ?? order.deliveryFee);
  const cash = money(financial?.codAmount ?? order.codAmount);

  await prisma.$transaction(async (tx) => {
    if (earning > 0) {
      await tx.driverWalletLedger.create({
        data: {
          driverId,
          orderId,
          type: "DELIVERY_EARNING",
          amount: earning,
          note: "أجرة التوصيل",
        },
      });
    }
    if (cash > 0) {
      await tx.driverWalletLedger.create({
        data: {
          driverId,
          orderId,
          type: "CASH_COLLECTED",
          amount: -cash,
          note: "كاش محصل من العميل",
        },
      });
    }
  });

  await syncDriverCashBlock(driverId);
}

export async function getDriverWalletBalance(driverId: string): Promise<number> {
  await ensureFinanceSchema();
  const rows = await prisma.driverWalletLedger.aggregate({
    where: { driverId },
    _sum: { amount: true },
  });
  return money(rows._sum.amount);
}

export async function recordSettlementLedger(
  driverId: string,
  settledAmount: number,
  orderIds: string[],
): Promise<void> {
  await ensureFinanceSchema();
  const amount = money(settledAmount);
  if (amount <= 0) {
    await syncDriverCashBlock(driverId);
    return;
  }
  await prisma.driverWalletLedger.create({
    data: {
      driverId,
      orderId: orderIds[0] ?? null,
      type: "SETTLEMENT",
      amount,
      note: `تسوية كاش (${orderIds.length} طلب)`,
    },
  });
  await prisma.driver.update({
    where: { id: driverId },
    data: { cashBlockedAt: null },
  });
}

export async function resolveDispute(input: {
  orderId: string
  faultParty: "DRIVER" | "STORE" | "PLATFORM" | "CUSTOMER" | "FORCE_MAJEURE"
  reason: string
  mealCost: number
  createdById?: string | null
}): Promise<{ ok: true; disputeId: string } | { ok: false; error: string }> {
  await ensureFinanceSchema();
  const order = await prisma.order.findFirst({
    where: { OR: [{ id: input.orderId }, { orderNumber: input.orderId }] },
    select: {
      id: true,
      driverId: true,
      storeId: true,
      deliveryFee: true,
      financial: true,
    },
  });
  if (!order) {
    return { ok: false, error: "order-not-found" };
  }

  const mealCost = money(input.mealCost);
  const driverEarning = money(order.financial?.driverEarning ?? order.deliveryFee);

  const dispute = await prisma.orderDispute.create({
    data: {
      orderId: order.id,
      faultParty: input.faultParty,
      status: "RESOLVED",
      reason: input.reason.slice(0, 500),
      mealCost,
      createdById: input.createdById ?? null,
      resolvedAt: new Date(),
      resolutionNote: resolveNote(input.faultParty),
    },
  });

  // Apply wallet side-effects per manifesto matrix (additive, never deletes history).
  if (input.faultParty === "DRIVER" && order.driverId && mealCost > 0) {
    await prisma.driverWalletLedger.create({
      data: {
        driverId: order.driverId,
        orderId: order.id,
        type: "FAULT_DEDUCTION",
        amount: -mealCost,
        note: "خصم تلف أثناء النقل",
      },
    });
  }

  if (input.faultParty === "FORCE_MAJEURE") {
    // Platform covers meal + driver earning via risk buffer (ledger note only for audit).
    if (order.driverId && driverEarning > 0) {
      await prisma.driverWalletLedger.create({
        data: {
          driverId: order.driverId,
          orderId: order.id,
          type: "BONUS",
          amount: driverEarning,
          note: "تغطية قوة قاهرة — أجرة السائق",
        },
      });
    }
  }

  await prisma.auditLog.create({
    data: {
      orderId: order.id,
      userId: input.createdById ?? null,
      action: "DISPUTE_RESOLVED",
      details: {
        disputeId: dispute.id,
        faultParty: input.faultParty,
        mealCost,
      },
    },
  });

  return { ok: true, disputeId: dispute.id };
}

function resolveNote(
  faultParty: "DRIVER" | "STORE" | "PLATFORM" | "CUSTOMER" | "FORCE_MAJEURE",
): string {
  switch (faultParty) {
    case "DRIVER":
      return "تلف أثناء النقل — خصم من محفظة السائق وصرف حق المتجر.";
    case "STORE":
      return "خطأ مطبخ/جودة — يتحمل المتجر قيمة الوجبة وأجرة السائق محفوظة.";
    case "FORCE_MAJEURE":
      return "قوة قاهرة — تغطية من صندوق المخاطر.";
    case "CUSTOMER":
      return "نزاع استلام — يتطلب إثبات تسليم (OTP/صورة).";
    default:
      return "تمت المعالجة وفق سياسة المنصة.";
  }
}

export async function getFinanceDashboardSnapshot(): Promise<{
  fieldCashHeld: number
  pendingStorePayouts: number
  platformNetProfit: number
  riskBufferAccrued: number
  cashBlockedDrivers: number
  config: PlatformFinanceConfig
}> {
  await ensureFinanceSchema();
  const config = await getFinanceConfig();

  const unsettled = await prisma.order.findMany({
    where: {
      status: "DELIVERED",
      cashSettledAt: null,
      bundleRole: { not: "CHILD" },
    },
    select: { codAmount: true },
  });
  const fieldCashHeld = money(
    unsettled.reduce((sum, row) => sum + money(row.codAmount), 0),
  );

  const financials = await prisma.orderFinancial.aggregate({
    _sum: {
      storeNetAmount: true,
      platformNetAmount: true,
      riskBufferAmount: true,
    },
  });

  const cashBlockedDrivers = await prisma.driver.count({
    where: { cashBlockedAt: { not: null } },
  });

  return {
    fieldCashHeld,
    pendingStorePayouts: money(financials._sum.storeNetAmount),
    platformNetProfit: money(financials._sum.platformNetAmount),
    riskBufferAccrued: money(financials._sum.riskBufferAmount),
    cashBlockedDrivers,
    config,
  };
}
