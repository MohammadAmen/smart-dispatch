export interface DiscountableProduct {
  price: number;
  hasDiscount: boolean;
  discountPrice: number | null;
}

export function isDiscountedProduct(product: DiscountableProduct): boolean {
  return (
    product.hasDiscount &&
    product.discountPrice != null &&
    Number.isFinite(product.discountPrice) &&
    product.discountPrice >= 0 &&
    product.discountPrice < product.price
  );
}

export function effectiveProductPrice(product: DiscountableProduct): number {
  if (isDiscountedProduct(product) && product.discountPrice != null) {
    return product.discountPrice;
  }

  return product.price;
}

export function discountPercentOff(product: DiscountableProduct): number | null {
  if (!isDiscountedProduct(product) || product.discountPrice == null || product.price <= 0) {
    return null;
  }

  return Math.max(1, Math.round((1 - product.discountPrice / product.price) * 100));
}

export const PRICE_CURRENCY = "ل.س";

export function formatMoney(value: number): string {
  const amount = Number.isFinite(value) ? Math.round(value) : 0;
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(amount);
}

export function formatPrice(value: number, currency = PRICE_CURRENCY): string {
  return `${formatMoney(value)} ${currency}`;
}
