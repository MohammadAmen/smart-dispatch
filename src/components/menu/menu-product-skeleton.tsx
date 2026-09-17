"use client";

import type { ReactNode } from "react";

import { menuProductGridClass, type MenuViewMode } from "@/lib/stores/menu-view";

export function MenuProductSkeleton({ mode }: { mode: MenuViewMode }): ReactNode {
  const count = mode === "dense" ? 6 : mode === "list" ? 5 : 3;

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="menu-skeleton h-5 w-28 rounded-full" />
        <div className={menuProductGridClass(mode)}>
          {Array.from({ length: count }, (_, index) => (
            <SkeletonCard key={index} mode={mode} />
          ))}
        </div>
      </div>
    </div>
  );
}

function SkeletonCard({ mode }: { mode: MenuViewMode }): ReactNode {
  if (mode === "list") {
    return (
      <div className="glass flex gap-3 overflow-hidden rounded-2xl p-2">
        <div className="menu-skeleton size-[5.5rem] shrink-0 rounded-2xl" />
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 py-1">
          <div className="menu-skeleton h-4 w-3/4 rounded-full" />
          <div className="menu-skeleton h-3 w-1/2 rounded-full" />
          <div className="menu-skeleton mt-1 h-4 w-20 rounded-full" />
        </div>
      </div>
    );
  }

  if (mode === "dense") {
    return (
      <div className="glass overflow-hidden rounded-2xl">
        <div className="menu-skeleton aspect-square" />
        <div className="space-y-2 p-2.5">
          <div className="menu-skeleton h-3.5 w-4/5 rounded-full" />
          <div className="menu-skeleton h-3 w-1/2 rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="glass overflow-hidden rounded-3xl">
      <div className="menu-skeleton aspect-[16/10]" />
      <div className="space-y-3 p-4">
        <div className="menu-skeleton h-4 w-2/3 rounded-full" />
        <div className="menu-skeleton h-3 w-full rounded-full" />
        <div className="menu-skeleton h-3 w-1/2 rounded-full" />
        <div className="mt-2 flex items-center justify-between">
          <div className="menu-skeleton h-5 w-24 rounded-full" />
          <div className="menu-skeleton size-9 rounded-full" />
        </div>
      </div>
    </div>
  );
}
