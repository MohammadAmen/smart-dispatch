import {
  Cake,
  Cross,
  Droplets,
  Flower2,
  Pill,
  ShoppingBasket,
  Store,
  UtensilsCrossed,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export const STORE_TYPE_ICONS = [
  "utensils",
  "cake",
  "flower",
  "store",
  "droplets",
  "wrench",
  "pill",
  "shopping-basket",
  "cross",
] as const;

export type StoreTypeIconName = (typeof STORE_TYPE_ICONS)[number];

const ICONS: Record<StoreTypeIconName, LucideIcon> = {
  utensils: UtensilsCrossed,
  cake: Cake,
  flower: Flower2,
  store: Store,
  droplets: Droplets,
  wrench: Wrench,
  pill: Pill,
  "shopping-basket": ShoppingBasket,
  cross: Cross,
};

export function isStoreTypeIcon(value: string): value is StoreTypeIconName {
  return (STORE_TYPE_ICONS as readonly string[]).includes(value);
}

export function storeTypeIcon(icon: string): LucideIcon {
  if (isStoreTypeIcon(icon)) {
    return ICONS[icon];
  }
  return Store;
}
