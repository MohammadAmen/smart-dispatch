import type { ProductOptionGroupRecord } from "@/lib/stores/product-options";

export type DiscoveryBadge = "TRENDING" | "DEAL" | "NEW";

export interface DiscoveryProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  hasDiscount: boolean;
  discountPrice: number | null;
  imageUrl: string | null;
  images: string[];
  soldCount: number;
  storeId: string;
  storeName: string;
  storeLogoUrl: string | null;
  storeLat: number | null;
  storeLng: number | null;
  distanceKm: number | null;
  badge: DiscoveryBadge;
  optionGroups: ProductOptionGroupRecord[];
}

export interface DiscoveryFeed {
  trending: DiscoveryProduct[];
  deals: DiscoveryProduct[];
  newArrivals: DiscoveryProduct[];
  curated: DiscoveryProduct[];
}

export const DISCOVERY_SECTION_LIMIT = 12;
export const DISCOVERY_TRENDING_DAYS = 14;
