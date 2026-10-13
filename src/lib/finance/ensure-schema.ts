import "server-only";

import { prisma } from "@/lib/db";
import { pgAddColumn } from "@/lib/stores/sql-schema";

let ready: Promise<void> | null = null;

async function migrateFinanceSchema(): Promise<void> {
  await pgAddColumn("stores", "commissionPercentage", "DOUBLE PRECISION NOT NULL DEFAULT 15");
  await pgAddColumn("drivers", "securityDeposit", "DOUBLE PRECISION NOT NULL DEFAULT 0");
  await pgAddColumn("drivers", "securityDepositPaidAt", "TIMESTAMP(3) NULL");
  await pgAddColumn("drivers", "securityDepositRefundedAt", "TIMESTAMP(3) NULL");
  await pgAddColumn("drivers", "cashLimitOverride", "DOUBLE PRECISION NULL");
  await pgAddColumn("drivers", "cashBlockedAt", "TIMESTAMP(3) NULL");
  await pgAddColumn("app_config", "financeJson", "TEXT NULL");
  await pgAddColumn("app_config", "companyJson", "TEXT NULL");
  await pgAddColumn("orders", "deliveryProofCode", "VARCHAR(8) NULL");
  await pgAddColumn("orders", "deliveryProofPhotoUrl", "VARCHAR(2048) NULL");
  await pgAddColumn("orders", "deliveryProofVerifiedAt", "TIMESTAMP(3) NULL");
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "WalletEntryType" AS ENUM (
        'DELIVERY_EARNING','CASH_COLLECTED','BONUS','FAULT_DEDUCTION',
        'SETTLEMENT','DEPOSIT','DEPOSIT_REFUND','RISK_BUFFER','ADJUSTMENT'
      );
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `);
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "DisputeFaultParty" AS ENUM (
        'DRIVER','STORE','PLATFORM','CUSTOMER','FORCE_MAJEURE'
      );
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `);
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "DisputeStatus" AS ENUM ('OPEN','RESOLVED','REJECTED');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `);
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "DeliveryProofMode" AS ENUM ('NONE','OTP','PHOTO','BOTH');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS order_financials (
      id VARCHAR(36) NOT NULL,
      "orderId" VARCHAR(36) NOT NULL,
      "storeId" VARCHAR(36) NULL,
      "itemsSubtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "deliveryFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "codAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "commissionPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "commissionAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "storeNetAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "platformGrossAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "riskBufferAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "platformNetAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "driverEarning" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "lockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT order_financials_orderId_key UNIQUE ("orderId")
    )
  `);

  // Additive columns after the base table exists (fresh DBs + legacy DBs).
  await pgAddColumn("order_financials", "storePayoutSettlementId", "VARCHAR(36) NULL");
  await pgAddColumn("order_financials", "storePayoutSettledAt", "TIMESTAMP(3) NULL");

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS driver_wallet_ledger (
      id VARCHAR(36) NOT NULL,
      "driverId" VARCHAR(36) NOT NULL,
      "orderId" VARCHAR(36) NULL,
      type "WalletEntryType" NOT NULL,
      amount DOUBLE PRECISION NOT NULL,
      note VARCHAR(500) NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS order_disputes (
      id VARCHAR(36) NOT NULL,
      "orderId" VARCHAR(36) NOT NULL,
      "faultParty" "DisputeFaultParty" NOT NULL,
      status "DisputeStatus" NOT NULL DEFAULT 'OPEN',
      reason VARCHAR(500) NOT NULL,
      "mealCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "resolutionNote" VARCHAR(500) NULL,
      "createdById" VARCHAR(36) NULL,
      "resolvedAt" TIMESTAMP(3) NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    )
  `);

  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS order_financials_storeId_idx ON order_financials ("storeId")`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS driver_wallet_ledger_driverId_createdAt_idx ON driver_wallet_ledger ("driverId", "createdAt")`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS order_disputes_orderId_idx ON order_disputes ("orderId")`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS drivers_cashBlockedAt_idx ON drivers ("cashBlockedAt")`,
  );

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS store_payout_settlements (
      id VARCHAR(36) NOT NULL,
      "invoiceNumber" VARCHAR(64) NOT NULL,
      "storeId" VARCHAR(36) NOT NULL,
      "periodFrom" TIMESTAMP(3) NOT NULL,
      "periodTo" TIMESTAMP(3) NOT NULL,
      "orderCount" INTEGER NOT NULL DEFAULT 0,
      "grossSales" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "commissionTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "netPayable" DOUBLE PRECISION NOT NULL DEFAULT 0,
      note VARCHAR(500) NULL,
      "settledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "settledById" VARCHAR(36) NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT store_payout_settlements_invoiceNumber_key UNIQUE ("invoiceNumber")
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS store_payout_lines (
      id VARCHAR(36) NOT NULL,
      "settlementId" VARCHAR(36) NOT NULL,
      "orderFinancialId" VARCHAR(36) NOT NULL,
      "orderId" VARCHAR(36) NOT NULL,
      "orderNumber" VARCHAR(64) NOT NULL,
      "itemsSubtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "commissionPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "commissionAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "storeNetAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "orderCreatedAt" TIMESTAMP(3) NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT store_payout_lines_orderFinancialId_key UNIQUE ("orderFinancialId")
    )
  `);

  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS store_payout_settlements_storeId_settledAt_idx ON store_payout_settlements ("storeId", "settledAt")`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS store_payout_lines_settlementId_idx ON store_payout_lines ("settlementId")`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS order_financials_storeId_storePayoutSettledAt_idx ON order_financials ("storeId", "storePayoutSettledAt")`,
  );
}

export async function ensureFinanceSchema(): Promise<void> {
  if (!ready) {
    ready = migrateFinanceSchema().catch((error: unknown) => {
      ready = null;
      throw error;
    });
  }
  await ready;
}
