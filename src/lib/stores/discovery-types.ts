export type DiscoveryBadge = "TRENDING" | "DEAL" | "NEW";

export interface DiscoveryProduct {
  id: string;
  name: string;
  price: number;
  hasDiscount: boolean;
  discountPrice: number | null;
  imageUrl: string | null;
  soldCount: number;
  storeId: string;
  storeName: string;
  storeLogoUrl: string | null;
  storeLat: number | null;
  storeLng: number | null;
  distanceKm: number | null;
  badge: DiscoveryBadge;
}

export interface DiscoveryFeed {
  trending: DiscoveryProduct[];
  deals: DiscoveryProduct[];
  newArrivals: DiscoveryProduct[];
  curated: DiscoveryProduct[];
}

export const DISCOVERY_SECTION_LIMIT = 12;
export const DISCOVERY_TRENDING_DAYS = 14;
