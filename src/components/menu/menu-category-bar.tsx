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
      className="flex gap-2.5 overflow-x-auto px-0.5 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="flex w-[4.75rem] shrink-0 flex-col items-center gap-1.5 text-center"
      aria-label={title}
    >
      <span className="relative block w-full rounded-2xl p-[3px]">
        <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
          <span className="custom-order-story-spin absolute inset-[-45%] bg-[conic-gradient(from_120deg,#14b8a6,#10b981,#22d3ee,#14b8a6)]" />
        </span>
        <span className="relative flex h-12 w-full items-center justify-center overflow-hidden rounded-[13px] bg-background">
          <span className="absolute inset-0 bg-linear-to-br from-teal-500/20 via-emerald-500/18 to-cyan-500/20" />
          <Palette className="relative size-5 animate-pulse text-teal-600 motion-reduce:animate-none dark:text-teal-300" />
        </span>
      </span>
      <span className="flex max-w-full flex-col items-center text-[11px] leading-tight font-semibold text-teal-700 dark:text-teal-300">
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
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="flex w-[4.75rem] shrink-0 flex-col items-center gap-1.5 text-center"
    >
      <span
        className={cn(
          "block w-full rounded-2xl p-[3px]",
          active ? "bg-primary" : "bg-border/80",
        )}
      >
        <span className="relative block h-12 w-full overflow-hidden rounded-[13px] bg-muted">
          <MenuSafeImage
            src={coverSrc}
            alt=""
            className="absolute inset-0 size-full object-cover"
            fallback={
              <span className="absolute inset-0 bg-linear-to-br from-primary/85 via-info/55 to-secondary" />
            }
          />
        </span>
      </span>
      <span
        className={cn(
          "flex max-w-full items-start justify-center gap-0.5 text-[11px] leading-tight font-semibold",
          active ? "text-primary" : "text-foreground",
        )}
      >
        <Icon className="mt-0.5 size-3 shrink-0 opacity-80" />
        <span className="line-clamp-2 text-start">{category.name}</span>
      </span>
    </m.button>
  );
}
