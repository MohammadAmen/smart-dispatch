export type OfferDiscountType = "PERCENT" | "AMOUNT";

export type OfferBucket = "live" | "scheduled" | "ended";

export interface PublicOffer {
  id: string;
  storeId: string;
  storeName: string;
  title: string;
  description: string;
  image: string | null;
  startDate: string;
  endDate: string;
  isActive: boolean;
  categoryId: string | null;
  productId: string | null;
  productName: string | null;
  categoryName: string | null;
  discountType: OfferDiscountType;
  discountVal: number;
}

export interface OfferRecord extends PublicOffer {
  endedNotifiedAt: string | null;
  createdAt: string;
}

export interface OfferWriteInput {
  title: string;
  description?: string;
  image?: string | null;
  startDate: Date;
  endDate: Date;
  isActive?: boolean;
  categoryId?: string | null;
  productId?: string | null;
  discountType: OfferDiscountType;
  discountVal: number;
}

export function isOfferDiscountType(value: unknown): value is OfferDiscountType {
  return value === "PERCENT" || value === "AMOUNT";
}

export function isOfferLive(
  offer: Pick<PublicOffer, "isActive" | "startDate" | "endDate">,
  now = Date.now(),
): boolean {
  if (!offer.isActive) {
    return false;
  }
  const start = Date.parse(offer.startDate);
  const end = Date.parse(offer.endDate);
  return Number.isFinite(start) && Number.isFinite(end) && start <= now && end > now;
}

export function offerBucket(
  offer: Pick<PublicOffer, "isActive" | "startDate" | "endDate">,
  now = Date.now(),
): OfferBucket {
  const start = Date.parse(offer.startDate);
  const end = Date.parse(offer.endDate);
  if (!Number.isFinite(end) || end <= now || !offer.isActive) {
    return "ended";
  }
  if (Number.isFinite(start) && start > now) {
    return "scheduled";
  }
  return "live";
}

export function remainingMs(endDate: string, now = Date.now()): number {
  const end = Date.parse(endDate);
  if (!Number.isFinite(end)) {
    return 0;
  }
  return Math.max(0, end - now);
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function offerSalePrice(
  basePrice: number,
  offer: Pick<PublicOffer, "discountType" | "discountVal">,
): number {
  const price = Number.isFinite(basePrice) ? basePrice : 0;
  const value = Number.isFinite(offer.discountVal) ? offer.discountVal : 0;
  const raw =
    offer.discountType === "PERCENT"
      ? price * (1 - Math.min(100, Math.max(0, value)) / 100)
      : price - Math.max(0, value);
  return Math.max(0, Math.round(raw));
}

export function offerAppliesToProduct(
  offer: Pick<PublicOffer, "productId" | "categoryId">,
  productId: string,
  categoryId: string,
): boolean {
  if (offer.productId) {
    return offer.productId === productId;
  }
  if (offer.categoryId) {
    return offer.categoryId === categoryId;
  }
  return true;
}

export function bestOfferForProduct(
  offers: PublicOffer[],
  productId: string,
  categoryId: string,
  now = Date.now(),
  basePrice?: number,
): PublicOffer | null {
  const live = offers.filter(
    (offer) => isOfferLive(offer, now) && offerAppliesToProduct(offer, productId, categoryId),
  );
  if (live.length === 0) {
    return null;
  }

  const productHits = live.filter((offer) => offer.productId === productId);
  const categoryHits = live.filter((offer) => !offer.productId && offer.categoryId === categoryId);
  const storeHits = live.filter((offer) => !offer.productId && !offer.categoryId);
  const pool = productHits.length > 0 ? productHits : categoryHits.length > 0 ? categoryHits : storeHits;

  if (basePrice == null || !Number.isFinite(basePrice)) {
    return pool[0] ?? null;
  }

  return [...pool].sort(
    (left, right) => offerSalePrice(basePrice, left) - offerSalePrice(basePrice, right),
  )[0] ?? null;
}

export function applyOfferToProduct<T extends {
  id: string;
  price: number;
  hasDiscount: boolean;
  discountPrice: number | null;
}>(product: T, categoryId: string, offers: PublicOffer[], now = Date.now()): T {
  const offer = bestOfferForProduct(offers, product.id, categoryId, now, product.price);
  if (!offer) {
    return product;
  }

  const sale = offerSalePrice(product.price, offer);
  const current =
    product.hasDiscount && product.discountPrice != null ? product.discountPrice : product.price;
  const best = Math.min(current, sale);
  if (best >= product.price) {
    return product;
  }

  return { ...product, hasDiscount: true, discountPrice: best };
}
