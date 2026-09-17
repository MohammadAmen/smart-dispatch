"use client";

import type { ReactNode } from "react";

import { StoreDiscoveryApp } from "@/components/menu/store-discovery-app";
import type { PublicOffer } from "@/lib/stores/offer-types";
import type { DirectoryStore, StoreTypeRecord } from "@/lib/stores/types";

export function MenuBoard({
  stores,
  storeTypes,
  offers,
  phone,
}: {
  stores: DirectoryStore[];
  storeTypes: StoreTypeRecord[];
  offers: PublicOffer[];
  phone: string;
}): ReactNode {
  return (
    <StoreDiscoveryApp stores={stores} storeTypes={storeTypes} offers={offers} phone={phone} />
  );
}
