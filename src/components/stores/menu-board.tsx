"use client";

import type { ReactNode } from "react";

import { StoreDiscoveryApp } from "@/components/menu/store-discovery-app";
import type { DeliveryTier } from "@/lib/platform/delivery-tiers";
import type { PublicOffer } from "@/lib/stores/offer-types";
import type { DirectoryStore, StoreTypeRecord } from "@/lib/stores/types";

export function MenuBoard({
  stores,
  storeTypes,
  offers,
  phone,
  headerBackgroundUrl = null,
  deliveryTiers,
}: {
  stores: DirectoryStore[];
  storeTypes: StoreTypeRecord[];
  offers: PublicOffer[];
  phone: string;
  headerBackgroundUrl?: string | null;
  deliveryTiers?: DeliveryTier[];
}): ReactNode {
  return (
    <StoreDiscoveryApp
      stores={stores}
      storeTypes={storeTypes}
      offers={offers}
      phone={phone}
      headerBackgroundUrl={headerBackgroundUrl}
      deliveryTiers={deliveryTiers}
    />
  );
}
