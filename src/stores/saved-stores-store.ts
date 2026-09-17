"use client";

import { create } from "zustand";

import {
  readSavedStores,
  writeSavedStores,
  type SavedStore,
} from "@/lib/stores/saved-stores";

interface SavedStoresState {
  stores: SavedStore[];
  hydrated: boolean;
  hydrate: () => void;
  isSaved: (storeId: string) => boolean;
  toggle: (store: SavedStore) => void;
  remove: (storeId: string) => void;
}

export const useSavedStoresStore = create<SavedStoresState>()((set, get) => ({
  stores: [],
  hydrated: false,
  hydrate: () => {
    set({ stores: readSavedStores(), hydrated: true });
  },
  isSaved: (storeId) => get().stores.some((store) => store.id === storeId),
  toggle: (store) => {
    const current = get().stores;
    const exists = current.some((item) => item.id === store.id);
    const stores = exists
      ? current.filter((item) => item.id !== store.id)
      : [store, ...current];
    writeSavedStores(stores);
    set({ stores, hydrated: true });
  },
  remove: (storeId) => {
    const stores = get().stores.filter((store) => store.id !== storeId);
    writeSavedStores(stores);
    set({ stores, hydrated: true });
  },
}));
