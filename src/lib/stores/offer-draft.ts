import type { ProductRecord } from "@/lib/stores/types";

export interface OfferDraft {
  productId: string;
  productName: string;
  discountVal: number;
}

export function offerDraftFromQuery(
  products: ProductRecord[],
  query: { productId?: string; discount?: string; name?: string },
): OfferDraft | null {
  const product = products.find((item) => item.id === query.productId);
  if (!product) {
    return null;
  }
  const parsed = Number(query.discount);
  const discountVal =
    Number.isFinite(parsed) && parsed >= 1 && parsed <= 100 ? Math.round(parsed) : 10;
  return {
    productId: product.id,
    productName: query.name?.trim() || product.name,
    discountVal,
  };
}
