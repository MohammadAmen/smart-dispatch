export interface GlobalCategoryRecord {
  id: string;
  storeTypeId: string | null;
  storeTypeName: string | null;
  parentId: string | null;
  name: string;
  slug: string;
  icon: string;
  imageUrl: string | null;
  sortOrder: number;
  isOther: boolean;
  active: boolean;
  linkedCount: number;
}

export interface GlobalCategoryWriteInput {
  name: string;
  storeTypeId: string;
  icon?: string;
  imageUrl?: string | null;
  sortOrder?: number;
  isOther?: boolean;
  active?: boolean;
  parentId?: string | null;
  slug?: string;
}
