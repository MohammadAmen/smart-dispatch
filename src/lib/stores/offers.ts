import "server-only";

import { prisma } from "@/lib/db";
import {
  isOfferDiscountType,
  isOfferLive,
  type OfferRecord,
  type OfferWriteInput,
  type PublicOffer,
} from "@/lib/stores/offer-types";

const offerInclude = {
  store: { select: { id: true, name: true } },
  category: { select: { id: true, name: true } },
  product: { select: { id: true, name: true } },
} as const;

let offersReady: Promise<void> | null = null;

async function columnExists(table: string, column: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ count: bigint | number }[]>`
    SELECT COUNT(*) AS count
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ${table}
      AND COLUMN_NAME = ${column}
  `;
  return Number(rows[0]?.count ?? 0) > 0;
}

async function migrateOffersSchema(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS offers (
      id VARCHAR(191) NOT NULL,
      storeId VARCHAR(191) NOT NULL,
      title VARCHAR(191) NOT NULL,
      description TEXT NOT NULL,
      image VARCHAR(2048) NULL,
      startDate DATETIME(3) NOT NULL,
      endDate DATETIME(3) NOT NULL,
      isActive BOOLEAN NOT NULL DEFAULT true,
      categoryId VARCHAR(191) NULL,
      productId VARCHAR(191) NULL,
      discountType VARCHAR(191) NOT NULL DEFAULT 'PERCENT',
      discountVal DOUBLE NOT NULL,
      endedNotifiedAt DATETIME(3) NULL,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt DATETIME(3) NOT NULL,
      PRIMARY KEY (id),
      KEY offers_storeId_isActive_endDate_idx (storeId, isActive, endDate),
      KEY offers_endDate_idx (endDate),
      KEY offers_categoryId_idx (categoryId),
      KEY offers_productId_idx (productId)
    )
  `);

  if (!(await columnExists("offers", "endedNotifiedAt"))) {
    await prisma.$executeRawUnsafe(
      "ALTER TABLE `offers` ADD COLUMN `endedNotifiedAt` DATETIME(3) NULL",
    );
  }
}

export async function ensureOffersSchema(): Promise<void> {
  if (!offersReady) {
    offersReady = migrateOffersSchema().catch((error: unknown) => {
      offersReady = null;
      throw error;
    });
  }
  await offersReady;
}

function serializeOffer(row: {
  id: string;
  storeId: string;
  title: string;
  description: string;
  image: string | null;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  categoryId: string | null;
  productId: string | null;
  discountType: string;
  discountVal: number;
  endedNotifiedAt: Date | null;
  createdAt: Date;
  store?: { id: string; name: string } | null;
  category?: { id: string; name: string } | null;
  product?: { id: string; name: string } | null;
}): OfferRecord {
  return {
    id: row.id,
    storeId: row.storeId,
    storeName: row.store?.name ?? "",
    title: row.title,
    description: row.description,
    image: row.image,
    startDate: row.startDate.toISOString(),
    endDate: row.endDate.toISOString(),
    isActive: row.isActive,
    categoryId: row.categoryId,
    productId: row.productId,
    categoryName: row.category?.name ?? null,
    productName: row.product?.name ?? null,
    discountType: isOfferDiscountType(row.discountType) ? row.discountType : "PERCENT",
    discountVal: row.discountVal,
    endedNotifiedAt: row.endedNotifiedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

function toPublic(offer: OfferRecord): PublicOffer {
  return {
    id: offer.id,
    storeId: offer.storeId,
    storeName: offer.storeName,
    title: offer.title,
    description: offer.description,
    image: offer.image,
    startDate: offer.startDate,
    endDate: offer.endDate,
    isActive: offer.isActive,
    categoryId: offer.categoryId,
    productId: offer.productId,
    productName: offer.productName,
    categoryName: offer.categoryName,
    discountType: offer.discountType,
    discountVal: offer.discountVal,
  };
}

function normalizeWindow(input: OfferWriteInput): { startDate: Date; endDate: Date } {
  const startDate = input.startDate;
  const endDate = input.endDate;
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    throw new Error("Offer dates are invalid.");
  }
  if (endDate.getTime() <= startDate.getTime()) {
    throw new Error("Offer must end after it starts.");
  }
  if (!Number.isFinite(input.discountVal) || input.discountVal <= 0) {
    throw new Error("A valid discount value is required.");
  }
  if (input.discountType === "PERCENT" && input.discountVal > 100) {
    throw new Error("Percent discount cannot exceed 100.");
  }
  return { startDate, endDate };
}

async function assertOfferTarget(
  storeId: string,
  categoryId: string | null,
  productId: string | null,
): Promise<void> {
  if (categoryId) {
    const category = await prisma.category.findFirst({
      where: { id: categoryId, storeId },
      select: { id: true },
    });
    if (!category) {
      throw new Error("Category not found.");
    }
  }
  if (productId) {
    const product = await prisma.product.findFirst({
      where: { id: productId, storeId },
      select: { id: true, categoryId: true },
    });
    if (!product) {
      throw new Error("Product not found.");
    }
  }
}

export async function listStoreOffers(storeId: string): Promise<OfferRecord[]> {
  await ensureOffersSchema();
  const rows = await prisma.offer.findMany({
    where: { storeId },
    include: offerInclude,
    orderBy: [{ isActive: "desc" }, { endDate: "asc" }],
  });
  return rows.map(serializeOffer);
}

export async function listLiveOffers(storeId?: string): Promise<PublicOffer[]> {
  await ensureOffersSchema();
  const now = new Date();
  const rows = await prisma.offer.findMany({
    where: {
      isActive: true,
      endDate: { gt: now },
      startDate: { lte: now },
      ...(storeId ? { storeId } : { store: { active: true } }),
    },
    include: offerInclude,
    orderBy: { endDate: "asc" },
  });
  return rows.map((row) => toPublic(serializeOffer(row))).filter((offer) => isOfferLive(offer));
}

export async function expireDueOffers(storeId?: string): Promise<OfferRecord[]> {
  await ensureOffersSchema();
  const now = new Date();
  const due = await prisma.offer.findMany({
    where: {
      endedNotifiedAt: null,
      endDate: { lte: now },
      ...(storeId ? { storeId } : {}),
    },
    include: offerInclude,
  });

  if (due.length === 0) {
    return [];
  }

  await prisma.offer.updateMany({
    where: { id: { in: due.map((row) => row.id) } },
    data: { isActive: false, endedNotifiedAt: now },
  });

  return due.map((row) =>
    serializeOffer({
      ...row,
      isActive: false,
      endedNotifiedAt: now,
    }),
  );
}

export async function createOffer(storeId: string, input: OfferWriteInput): Promise<OfferRecord> {
  await ensureOffersSchema();
  const title = input.title.trim();
  if (!title) {
    throw new Error("Offer title is required.");
  }
  if (!isOfferDiscountType(input.discountType)) {
    throw new Error("Discount type is invalid.");
  }

  const { startDate, endDate } = normalizeWindow(input);
  const categoryId = input.categoryId?.trim() || null;
  const productId = input.productId?.trim() || null;
  await assertOfferTarget(storeId, categoryId, productId);

  const row = await prisma.offer.create({
    data: {
      storeId,
      title,
      description: input.description?.trim() ?? "",
      image: input.image ?? null,
      startDate,
      endDate,
      isActive: input.isActive ?? true,
      categoryId,
      productId,
      discountType: input.discountType,
      discountVal: input.discountVal,
    },
    include: offerInclude,
  });
  return serializeOffer(row);
}

export async function updateOffer(
  storeId: string,
  id: string,
  input: OfferWriteInput,
): Promise<OfferRecord> {
  await ensureOffersSchema();
  const existing = await prisma.offer.findFirst({
    where: { id, storeId },
    select: { id: true },
  });
  if (!existing) {
    throw new Error("Offer not found.");
  }

  const title = input.title.trim();
  if (!title) {
    throw new Error("Offer title is required.");
  }
  if (!isOfferDiscountType(input.discountType)) {
    throw new Error("Discount type is invalid.");
  }

  const { startDate, endDate } = normalizeWindow(input);
  const categoryId = input.categoryId?.trim() || null;
  const productId = input.productId?.trim() || null;
  await assertOfferTarget(storeId, categoryId, productId);

  const row = await prisma.offer.update({
    where: { id },
    data: {
      title,
      description: input.description?.trim() ?? "",
      image: input.image ?? null,
      startDate,
      endDate,
      isActive: input.isActive ?? true,
      categoryId,
      productId,
      discountType: input.discountType,
      discountVal: input.discountVal,
      endedNotifiedAt: endDate.getTime() > Date.now() ? null : undefined,
    },
    include: offerInclude,
  });
  return serializeOffer(row);
}

export async function deleteOffer(storeId: string, id: string): Promise<void> {
  await ensureOffersSchema();
  const existing = await prisma.offer.findFirst({
    where: { id, storeId },
    select: { id: true },
  });
  if (!existing) {
    throw new Error("Offer not found.");
  }
  await prisma.offer.delete({ where: { id } });
}
