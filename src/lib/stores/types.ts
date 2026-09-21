import type { PublicOffer } from "@/lib/stores/offer-types";
import type { ProductOptionGroupRecord } from "@/lib/stores/product-options";

export type { PublicOffer } from "@/lib/stores/offer-types";

export interface StoreTypeRecord {
  id: string;
  name: string;
  icon: string;
  sortOrder: number;
  storeCount: number;
}

export interface StoreOwnerOption {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export interface StoreDriverOption {
  id: string;
  userId: string;
  name: string;
  phone: string;
  status: string;
  vehicleType: string;
}

export interface StoreRecord {
  id: string;
  name: string;
  slug: string;
  storeTypeId: string;
  storeType: StoreTypeRecord;
  phone: string | null;
  address: string | null;
  city: string | null;
  logoUrl: string | null;
  coverImage: string | null;
  receiptFooterNote: string | null;
  latitude: number | null;
  longitude: number | null;
  rating: number;
  active: boolean;
  ownerId: string | null;
  owner: StoreOwnerOption | null;
  categoryCount: number;
  productCount: number;
  createdAt: string;
}

export interface CategoryRecord {
  id: string;
  storeId: string;
  name: string;
  sortOrder: number;
  active: boolean;
  productCount: number;
}

export interface ProductRecord {
  id: string;
  storeId: string;
  categoryId: string;
  categoryName: string;
  name: string;
  description: string;
  price: number;
  hasDiscount: boolean;
  discountPrice: number | null;
  imageUrl: string | null;
  images: string[];
  available: boolean;
  sortOrder: number;
  optionGroups: ProductOptionGroupRecord[];
}

export interface StoreWriteInput {
  name: string;
  storeTypeId: string;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  logoUrl?: string | null;
  coverImage?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  rating?: number;
  active?: boolean;
  ownerId?: string | null;
}

export interface StoreTypeWriteInput {
  name: string;
  icon: string;
  sortOrder?: number;
}

export interface OwnerWriteInput {
  name: string;
  email: string;
  phone: string;
  password?: string;
}

export interface DriverWriteInput {
  name: string;
  email: string;
  phone: string;
  vehicleType?: string;
  password?: string;
}

export interface CategoryWriteInput {
  name: string;
  sortOrder?: number;
  active?: boolean;
}

export interface ProductWriteInput {
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  hasDiscount?: boolean;
  discountPrice?: number | null;
  imageUrl?: string | null;
  images?: string[];
  available?: boolean;
  sortOrder?: number;
}

export interface MenuProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  hasDiscount: boolean;
  discountPrice: number | null;
  imageUrl: string | null;
  images: string[];
  available: boolean;
  optionGroups: ProductOptionGroupRecord[];
}

export interface MenuCategory {
  id: string;
  name: string;
  products: MenuProduct[];
}

export interface MenuStore {
  id: string;
  name: string;
  slug: string;
  storeType: Pick<StoreTypeRecord, "id" | "name" | "icon">;
  phone: string | null;
  address: string | null;
  city: string | null;
  logoUrl: string | null;
  coverImage: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  welcomeMessage: string | null;
  latitude: number | null;
  longitude: number | null;
  rating: number;
  categories: MenuCategory[];
  offers: PublicOffer[];
}

export interface DirectoryStore {
  id: string;
  name: string;
  slug: string;
  storeType: Pick<StoreTypeRecord, "id" | "name" | "icon">;
  phone: string | null;
  address: string | null;
  city: string | null;
  logoUrl: string | null;
  coverImage: string | null;
  latitude: number | null;
  longitude: number | null;
  rating: number;
}
