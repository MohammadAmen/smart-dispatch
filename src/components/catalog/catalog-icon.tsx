"use client";

import { Bike, Bus, Car, Package, Snowflake, Truck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  truck: Truck,
  van: Truck,
  bike: Bike,
  car: Car,
  snowflake: Snowflake,
  package: Package,
  bus: Bus,
};

export function CatalogIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}): ReactNode {
  const Icon = ICONS[name] ?? Truck;
  return <Icon className={cn("size-4", className)} />;
}
