"use client";

import { Minus, Plus } from "lucide-react";
import { m } from "framer-motion";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function MenuQtyControl({
  quantity,
  onIncrease,
  onDecrease,
  size = "default",
}: {
  quantity: number;
  onIncrease: () => void;
  onDecrease: () => void;
  size?: "default" | "sm";
}): ReactNode {
  const compact = size === "sm";

  if (quantity <= 0) {
    return (
      <Button
        size={compact ? "icon-sm" : "icon"}
        className={cn("rounded-full shadow-md", compact && "size-7")}
        onPress={onIncrease}
        aria-label="+"
      >
        <Plus className={compact ? "size-3.5" : "size-4"} />
      </Button>
    );
  }

  return (
    <m.div
      initial={{ scale: 0.92, opacity: 0.7 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        "flex items-center rounded-full border border-border/70 bg-background/90 shadow-sm",
        compact ? "gap-0.5 p-0.5" : "gap-1 p-0.5",
      )}
    >
      <Button size="icon-xs" variant="ghost" className="rounded-full" onPress={onDecrease}>
        <Minus className="size-3.5" />
      </Button>
      <span className={cn("text-center text-sm font-semibold", compact ? "min-w-4" : "min-w-5")}>
        {quantity}
      </span>
      <Button size="icon-xs" className="rounded-full" onPress={onIncrease}>
        <Plus className="size-3.5" />
      </Button>
    </m.div>
  );
}
