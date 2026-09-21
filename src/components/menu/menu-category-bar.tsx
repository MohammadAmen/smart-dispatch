"use client";

import { m } from "framer-motion";
import { Palette } from "lucide-react";
import { type ReactNode, type RefObject } from "react";

import { MenuSafeImage } from "@/components/menu/menu-safe-image";
import { categoryCoverUrl } from "@/lib/stores/category-cover";
import { categoryIcon } from "@/lib/stores/category-icon";
import type { MenuCategory } from "@/lib/stores/types";
import { cn } from "@/lib/utils";

export function MenuCategoryBar({
  categories,
  activeId,
  storeCover,
  tabRowRef,
  customStory,
  onSelect,
  onCustomStory,
}: {
  categories: MenuCategory[];
  activeId: string;
  storeCover: string | null;
  tabRowRef: RefObject<HTMLDivElement | null>;
  customStory?: { title: string; hint: string };
  onSelect: (categoryId: string) => void;
  onCustomStory?: () => void;
}): ReactNode {
  return (
    <div
      ref={tabRowRef}
      className="flex gap-3 overflow-x-auto px-0.5 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {customStory && onCustomStory ? (
        <CustomOrderStory title={customStory.title} hint={customStory.hint} onPress={onCustomStory} />
      ) : null}
      {categories.map((category) => (
        <CategoryCard
          key={category.id}
          category={category}
          active={category.id === activeId}
          coverSrc={categoryCoverUrl(category, storeCover)}
          onSelect={() => onSelect(category.id)}
        />
      ))}
    </div>
  );
}

function CustomOrderStory({
  title,
  hint,
  onPress,
}: {
  title: string;
  hint: string;
  onPress: () => void;
}): ReactNode {
  return (
    <m.button
      type="button"
      onClick={onPress}
      whileTap={{ scale: 0.96 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="flex w-[4.35rem] shrink-0 flex-col items-center gap-1.5 text-center"
      aria-label={title}
    >
      <span className="relative flex size-14 items-center justify-center rounded-full p-[3px]">
        <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
          <span className="brand-conic custom-order-story-spin absolute inset-[-45%]" />
        </span>
        <span className="relative flex size-full items-center justify-center overflow-hidden rounded-full bg-background">
          <span className="absolute inset-0 bg-linear-to-br from-primary/20 via-warning/16 to-glow/20" />
          <Palette className="relative size-5 animate-pulse text-primary motion-reduce:animate-none" />
        </span>
      </span>
      <span className="flex max-w-full flex-col items-center text-[11px] leading-tight font-semibold text-primary">
        <span className="line-clamp-1">{title}</span>
        <span className="line-clamp-1 text-[10px] font-medium text-muted-foreground">{hint}</span>
      </span>
    </m.button>
  );
}

function CategoryCard({
  category,
  active,
  coverSrc,
  onSelect,
}: {
  category: MenuCategory;
  active: boolean;
  coverSrc: string | null;
  onSelect: () => void;
}): ReactNode {
  const Icon = categoryIcon(category.name);

  return (
    <m.button
      type="button"
      data-cat={category.id}
      onClick={onSelect}
      whileTap={{ scale: 0.96 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="flex w-[4.35rem] shrink-0 flex-col items-center gap-1.5 text-center"
    >
      <span
        className={cn(
          "relative flex size-14 items-center justify-center rounded-full p-[3px] transition-shadow duration-200",
          active
            ? "bg-primary shadow-[0_0_18px_color-mix(in_oklch,var(--primary)_70%,transparent)]"
            : "bg-border/80",
        )}
      >
        <span className="relative size-full overflow-hidden rounded-full bg-muted">
          <MenuSafeImage
            src={coverSrc}
            alt=""
            className="absolute inset-0 size-full object-cover"
            fallback={
              <span className="absolute inset-0 flex items-center justify-center bg-linear-to-br from-primary/85 via-info/55 to-secondary text-primary-foreground">
                <Icon className="size-5" />
              </span>
            }
          />
        </span>
      </span>
      <span
        className={cn(
          "line-clamp-2 max-w-full text-[11px] leading-tight font-semibold",
          active ? "text-primary" : "text-foreground",
        )}
      >
        {category.name}
      </span>
    </m.button>
  );
}
