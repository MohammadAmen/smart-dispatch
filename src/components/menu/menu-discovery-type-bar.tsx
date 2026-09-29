"use client";

import { Flame } from "lucide-react";
import type { ReactNode } from "react";

import { CategoryGridCard } from "@/components/menu/category-grid-card";
import { useLocale } from "@/components/providers/locale-provider";
import { storeTypeIcon } from "@/lib/stores/store-type-icon";
import type { StoreTypeRecord } from "@/lib/stores/types";

export function MenuDiscoveryTypeBar({
  storeTypes,
  typeId,
  burnActive,
  coverByTypeId,
  onSelectAll,
  onToggleBurn,
  onSelectType,
}: {
  storeTypes: StoreTypeRecord[];
  typeId: string;
  burnActive: boolean;
  coverByTypeId: Map<string, string>;
  onSelectAll: () => void;
  onToggleBurn: () => void;
  onSelectType: (id: string) => void;
}): ReactNode {
  const { t } = useLocale();

  return (
    <div className="border-b border-border/60 bg-background/80 pb-2 pt-2.5">
      <div className="scrollbar-none flex gap-3 overflow-x-auto px-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <CategoryGridCard
          label={t("menu.allTypes")}
          active={typeId === "all" && !burnActive}
          variant="beev-all"
          onSelect={onSelectAll}
        />
        <CategoryGridCard
          label={t("menu.burnTitle")}
          active={burnActive}
          variant="burn"
          icon={<Flame className="size-8 animate-pulse fill-white text-white sm:size-9" />}
          onSelect={onToggleBurn}
        />
        {storeTypes.map((type) => {
          const Icon = storeTypeIcon(type.icon);
          return (
            <CategoryGridCard
              key={type.id}
              label={type.name}
              imageUrl={coverByTypeId.get(type.id) ?? null}
              icon={<Icon className="size-8 text-white/90" />}
              active={!burnActive && typeId === type.id}
              onSelect={() => onSelectType(type.id)}
            />
          );
        })}
      </div>
    </div>
  );
}
