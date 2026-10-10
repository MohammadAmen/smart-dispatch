export type DeliveryProofMode = "NONE" | "OTP" | "PHOTO" | "BOTH";

export interface PlatformFinanceConfig {
  /** Refundable driver security deposit required at onboarding. */
  driverSecurityDeposit: number
  /** Max unsettled COD a driver may hold before offers pause. */
  driverCashLimit: number
  /** % of platform gross commission reserved for force-majeure cover. */
  riskBufferPercentage: number
  /** Fallback commission % when a store has no custom rate. */
  defaultStoreCommissionPercentage: number
  /** Delivery confirmation policy. */
  deliveryProofMode: DeliveryProofMode
}

export const DEFAULT_FINANCE_CONFIG: PlatformFinanceConfig = {
  driverSecurityDeposit: 100,
  driverCashLimit: 100,
  riskBufferPercentage: 0.5,
  defaultStoreCommissionPercentage: 15,
  deliveryProofMode: "OTP",
};

export function normalizeFinanceConfig(
  input: Partial<PlatformFinanceConfig> | null | undefined,
): PlatformFinanceConfig {
  const next = { ...DEFAULT_FINANCE_CONFIG, ...(input ?? {}) };
  return {
    driverSecurityDeposit: clampMoney(next.driverSecurityDeposit, 0, 1_000_000),
    driverCashLimit: clampMoney(next.driverCashLimit, 0, 1_000_000),
    riskBufferPercentage: clampMoney(next.riskBufferPercentage, 0, 25),
    defaultStoreCommissionPercentage: clampMoney(
      next.defaultStoreCommissionPercentage,
      0,
      100,
    ),
    deliveryProofMode: normalizeProofMode(next.deliveryProofMode),
  };
}

function normalizeProofMode(value: unknown): DeliveryProofMode {
  if (value === "NONE" || value === "OTP" || value === "PHOTO" || value === "BOTH") {
    return value;
  }
  return DEFAULT_FINANCE_CONFIG.deliveryProofMode;
}

export function clampMoney(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, Math.round(value * 100) / 100));
}

export function money(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  return Math.round(value * 100) / 100;
}

export interface OrderFinancialBreakdown {
  itemsSubtotal: number
  deliveryFee: number
  codAmount: number
  commissionPercentage: number
  commissionAmount: number
  storeNetAmount: number
  platformGrossAmount: number
  riskBufferAmount: number
  platformNetAmount: number
  driverEarning: number
}

export function computeOrderFinancial(input: {
  itemsSubtotal: number
  deliveryFee: number
  commissionPercentage: number
  riskBufferPercentage: number
}): OrderFinancialBreakdown {
  const itemsSubtotal = money(input.itemsSubtotal);
  const deliveryFee = money(input.deliveryFee);
  const commissionPercentage = clampMoney(input.commissionPercentage, 0, 100);
  const commissionAmount = money((itemsSubtotal * commissionPercentage) / 100);
  const storeNetAmount = money(itemsSubtotal - commissionAmount);
  const platformGrossAmount = commissionAmount;
  const riskBufferAmount = money(
    (platformGrossAmount * clampMoney(input.riskBufferPercentage, 0, 25)) / 100,
  );
  const platformNetAmount = money(platformGrossAmount - riskBufferAmount);
  const driverEarning = deliveryFee;
  const codAmount = money(itemsSubtotal + deliveryFee);

  return {
    itemsSubtotal,
    deliveryFee,
    codAmount,
    commissionPercentage,
    commissionAmount,
    storeNetAmount,
    platformGrossAmount,
    riskBufferAmount,
    platformNetAmount,
    driverEarning,
  };
}
