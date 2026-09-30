"use client";

import { create } from "zustand";

interface MenuUiState {
  checkoutOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  setCheckoutOpen: (open: boolean) => void;
}

function blurActiveInput(): void {
  if (typeof document === "undefined") {
    return;
  }
  const active = document.activeElement;
  if (active instanceof HTMLElement) {
    active.blur();
  }
}

export const useMenuUiStore = create<MenuUiState>((set, get) => ({
  checkoutOpen: false,
  openCart: () => {
    blurActiveInput();
    set({ checkoutOpen: true });
  },
  closeCart: () => {
    blurActiveInput();
    set({ checkoutOpen: false });
  },
  setCheckoutOpen: (open) => {
    if (get().checkoutOpen === open) {
      return;
    }
    blurActiveInput();
    set({ checkoutOpen: open });
  },
}));
