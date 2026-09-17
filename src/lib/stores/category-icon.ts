import {
  Coffee,
  Droplets,
  Drumstick,
  Fish,
  IceCream,
  Pizza,
  Salad,
  Sandwich,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

export { storeTypeIcon } from "@/lib/stores/store-type-icon";

const CATEGORY_ICONS: Array<{ test: RegExp; icon: LucideIcon }> = [
  { test: /قهوة|شاي|coffee|tea|cafe/i, icon: Coffee },
  { test: /عصير|مشروب|drink|juice|soda/i, icon: Droplets },
  { test: /ماء|غاز|water|gas/i, icon: Droplets },
  { test: /بيتزا|pizza/i, icon: Pizza },
  { test: /برغر|ساندويتش|burger|sandwich/i, icon: Sandwich },
  { test: /سلطة|صحي|salad/i, icon: Salad },
  { test: /دجاج|لحم|مشاوي|chicken|meat|grill/i, icon: Drumstick },
  { test: /سمك|seafood|fish/i, icon: Fish },
  { test: /حلو|كيك|آيس|dessert|sweet|ice/i, icon: IceCream },
];

export function categoryIcon(name: string): LucideIcon {
  const match = CATEGORY_ICONS.find((entry) => entry.test.test(name));
  return match?.icon ?? UtensilsCrossed;
}
