import "server-only";

import { prisma } from "@/lib/db";
import { normalizeProductImages } from "@/lib/stores/product-images";
import { pgAddColumn } from "@/lib/stores/sql-schema";

let imagesReady: Promise<void> | null = null;

async function migrateProductImagesSchema(): Promise<void> {
  await pgAddColumn("products", "images", "JSONB NULL");
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
        SELECT id, "imageUrl", images FROM products WHERE "storeId" = ${storeId}
      `
    : await prisma.$queryRaw<{ id: string; imageUrl: string | null; images: unknown }[]>`
        SELECT id, "imageUrl", images FROM products
      `;

  return new Map(
    rows.map((row) => [row.id, normalizeProductImages(row.imageUrl, row.images)]),
  );
}
