import "server-only";

import { prisma } from "@/lib/db";
import { normalizeProductImages } from "@/lib/stores/product-images";

let imagesReady: Promise<void> | null = null;

async function columnExists(column: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ count: bigint | number }[]>`
    SELECT COUNT(*) AS count
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = "products"
      AND COLUMN_NAME = ${column}
  `;
  return Number(rows[0]?.count ?? 0) > 0;
}

async function migrateProductImagesSchema(): Promise<void> {
  if (await columnExists("images")) {
    return;
  }
  await prisma.$executeRawUnsafe("ALTER TABLE `products` ADD COLUMN `images` JSON NULL");
}

export async function ensureProductImagesSchema(): Promise<void> {
  if (!imagesReady) {
    imagesReady = migrateProductImagesSchema().catch((error: unknown) => {
      imagesReady = null;
      throw error;
    });
  }
  await imagesReady;
}

export async function persistProductImages(id: string, images: string[]): Promise<void> {
  await ensureProductImagesSchema();
  const list = normalizeProductImages(images[0] ?? null, images);
  await prisma.product.update({
    where: { id },
    data: {
      imageUrl: list[0] ?? null,
      images: list,
    },
  });
}

export async function loadProductImagesMap(
  storeId?: string,
): Promise<Map<string, string[]>> {
  await ensureProductImagesSchema();
  const rows = storeId
    ? await prisma.$queryRaw<{ id: string; imageUrl: string | null; images: unknown }[]>`
        SELECT id, imageUrl, images FROM products WHERE storeId = ${storeId}
      `
    : await prisma.$queryRaw<{ id: string; imageUrl: string | null; images: unknown }[]>`
        SELECT id, imageUrl, images FROM products
      `;

  return new Map(
    rows.map((row) => [row.id, normalizeProductImages(row.imageUrl, row.images)]),
  );
}
