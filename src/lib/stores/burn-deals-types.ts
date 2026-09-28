export interface BurnDealProduct {
  id: string;
  name: string;
  price: number;
  discountPrice: number;
  imageUrl: string | null;
  discountPercent: number;
}

export interface BurnDealStore {
  storeId: string;
  storeName: string;
  storeLogoUrl: string | null;
  storeCoverImage: string | null;
  storeTypeId: string | null;
  storeTypeName: string | null;
  dealsCount: number;
  products: BurnDealProduct[];
}

export interface BurnDealsFeed {
  stores: BurnDealStore[];
}

export const BURN_DEALS_PER_STORE = 4;
export const BURN_DEALS_CACHE_MS = 45_000;
