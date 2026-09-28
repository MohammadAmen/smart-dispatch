export interface PublicSubCategory {
  id: string;
  name: string;
  icon: string;
  imageUrl: string | null;
  storeIds: string[];
  storeCount: number;
  isFallback: boolean;
  isOther: boolean;
}

export interface SubCategoriesFeed {
  mainCategoryId: string;
  items: PublicSubCategory[];
}

export const SUB_CATEGORY_GEO_RADIUS_KM = 35;
