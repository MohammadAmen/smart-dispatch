import "server-only";

import { redirect } from "next/navigation";

import { isSuperAdminRole } from "@/lib/auth/constants";
import { readSession } from "@/lib/auth/server";
import { getStoreForOwner, getStoreShellForOwner, listCategories, listProducts, listVendorPosProducts } from "@/lib/stores/service";
import { listStoreOffers } from "@/lib/stores/offers";
import type { OfferRecord } from "@/lib/stores/offer-types";
import { listVendorStories } from "@/lib/stores/story-service";
import type { VendorStoryRecord } from "@/lib/stores/story-types";
import type { CategoryRecord, ProductRecord, StoreRecord } from "@/lib/stores/types";
import type { VendorOrderFilter } from "@/lib/stores/order-status";
import {
  listStoreOrdersPage,
  type VendorOrdersPageResult,
} from "@/lib/stores/vendor-orders";
import type { VendorOrderSource } from "@/lib/stores/vendor-order-query";

export interface VendorCatalog {
  store: StoreRecord | null;
  categories: CategoryRecord[];
  products: ProductRecord[];
  offers: OfferRecord[];
  stories: VendorStoryRecord[];
}

export async function loadVendorCatalog(loginPath: string): Promise<VendorCatalog> {
  const session = await readSession();
  if (!session || (session.role !== "STORE_OWNER" && !isSuperAdminRole(session.role))) {
    redirect(loginPath);
  }

  const store = await getStoreForOwner(session.sub);
  if (!store) {
    return { store: null, categories: [], products: [], offers: [], stories: [] };
  }

  const [categories, products, offers, stories] = await Promise.all([
    listCategories(store.id),
    listProducts(store.id),
    listStoreOffers(store.id),
    listVendorStories(store.id),
  ]);

  return { store, categories, products, offers, stories };
}

export async function loadVendorShell(loginPath: string): Promise<{
  storeId: string | null;
  storeActive: boolean;
  storePhone: string | null;
  storeType: { icon: string; name: string } | null;
}> {
  const session = await readSession();
  if (!session || (session.role !== "STORE_OWNER" && !isSuperAdminRole(session.role))) {
    redirect(loginPath);
  }

  const store = await getStoreShellForOwner(session.sub);
  return {
    storeId: store?.id ?? null,
    storeActive: store?.active ?? false,
    storePhone: store?.phone ?? null,
    storeType: store?.storeType ?? null,
  };
}

export async function loadVendorOrders(
  loginPath: string,
  query: { page: number; status: VendorOrderFilter; orderSource: VendorOrderSource },
): Promise<{ store: StoreRecord | null; products: ProductRecord[]; page: VendorOrdersPageResult | null }> {
  const session = await readSession();
  if (!session || (session.role !== "STORE_OWNER" && !isSuperAdminRole(session.role))) {
    redirect(loginPath);
  }

  const store = await getStoreForOwner(session.sub);
  if (!store) {
    return { store: null, products: [], page: null };
  }

  const [page, products] = await Promise.all([
    listStoreOrdersPage({ storeId: store.id, ...query }),
    listVendorPosProducts(store.id),
  ]);
  return { store, products, page };
}
