import { primaryProductImage } from "@/lib/stores/product-images";
import type { MenuCategory } from "@/lib/stores/types";

export function categoryCoverUrl(
  category: MenuCategory,
  storeCover: string | null,
): string | null {
  const fromProduct = category.products.find((product) => primaryProductImage(product));
  const coverFromProduct = fromProduct ? primaryProductImage(fromProduct) : null;
  if (coverFromProduct) {
    return coverFromProduct;
  }

  const cover = storeCover?.trim();
  return cover ? cover : null;
}
