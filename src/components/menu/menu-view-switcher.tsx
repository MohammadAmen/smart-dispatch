"use client";

import { Grid2x2, LayoutGrid, List } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import type { MenuViewMode } from "@/lib/stores/menu-view";
import { MENU_VIEW_MODES } from "@/lib/stores/menu-view";
import { cn } from "@/lib/utils";

const VIEW_ICONS: Record<MenuViewMode, LucideIcon> = {
  large: LayoutGrid,
  list: List,
  dense: Grid2x2,
};

const VIEW_LABEL_KEYS: Record<MenuViewMode, "menu.viewLarge" | "menu.viewList" | "menu.viewDense"> = {
  large: "menu.viewLarge",
  list: "menu.viewList",
  dense: "menu.viewDense",
};

export function MenuViewSwitcher({
  value,
  onChange,
}: {
  value: MenuViewMode;
  onChange: (mode: MenuViewMode) => void;
}): ReactNode {
  const { t } = useLocale();

  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
        {t("menu.viewMode")}
      </p>
      <div className="flex rounded-full border border-border/70 bg-background/70 p-0.5 shadow-sm">
        {MENU_VIEW_MODES.map((mode) => {
          const Icon = VIEW_ICONS[mode];
          const active = mode === value;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => onChange(mode)}
              aria-label={t(VIEW_LABEL_KEYS[mode])}
              aria-pressed={active}
              className={cn(
                "inline-flex size-8 items-center justify-center rounded-full transition-colors",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-3.5" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
