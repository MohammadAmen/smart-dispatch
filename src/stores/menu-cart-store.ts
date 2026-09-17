"use client";

import { create } from "zustand";

import {
  emptyCartSnapshot,
  readCartSnapshot,
  writeCartSnapshot,
  type MenuCartLine,
} from "@/lib/stores/menu-cart";
import { reportCartIntent } from "@/lib/stores/menu-signals";

interface MenuCartState {
  lines: MenuCartLine[];
  storeNotes: Record<string, string>;
  hydrated: boolean;
  hydrate: () => void;
  add: (line: Omit<MenuCartLine, "quantity">, quantity?: number) => void;
  addMany: (entries: { line: Omit<MenuCartLine, "quantity">; quantity?: number }[]) => void;
  increase: (lineKey: string) => void;
  remove: (lineKey: string) => void;
  setNote: (storeId: string, note: string) => void;
  clear: () => void;
}

function pruneNotes(lines: MenuCartLine[], notes: Record<string, string>): Record<string, string> {
  const ids = new Set(lines.map((line) => line.storeId));
  const next: Record<string, string> = {};
  for (const [storeId, note] of Object.entries(notes)) {
    if (ids.has(storeId) && note.trim()) {
      next[storeId] = note;
    }
  }
  return next;
}

function mergeLine(lines: MenuCartLine[], line: Omit<MenuCartLine, "quantity">, quantity: number): MenuCartLine[] {
  const key = line.lineKey || line.productId;
  const next = { ...line, lineKey: key };
  const existing = lines.find((item) => item.lineKey === key);
  if (!existing) {
    return [...lines, { ...next, quantity: Math.min(99, Math.max(1, quantity)) }];
  }
  return lines.map((item) =>
    item.lineKey === key
      ? { ...item, ...next, quantity: Math.min(99, item.quantity + quantity), price: line.price }
      : item,
  );
}

function persist(lines: MenuCartLine[], storeNotes: Record<string, string>): void {
  writeCartSnapshot({ lines, storeNotes });
}

export const useMenuCartStore = create<MenuCartState>()((set, get) => ({
  lines: [],
  storeNotes: {},
  hydrated: false,
  hydrate: () => {
    const saved = readCartSnapshot();
    set({ lines: saved.lines, storeNotes: saved.storeNotes, hydrated: true });
  },
  add: (line, quantity = 1) => {
    const current = get();
    const lines = mergeLine(current.lines, line, quantity);
    persist(lines, current.storeNotes);
    set({ lines });
    reportCartIntent(line.storeId, line.productId);
  },
  addMany: (entries) => {
    const current = get();
    let lines = current.lines;
    for (const entry of entries) {
      lines = mergeLine(lines, entry.line, entry.quantity ?? 1);
      reportCartIntent(entry.line.storeId, entry.line.productId);
    }
    persist(lines, current.storeNotes);
    set({ lines });
  },
  increase: (lineKey) => {
    const current = get();
    const lines = current.lines.map((item) =>
      item.lineKey === lineKey ? { ...item, quantity: Math.min(99, item.quantity + 1) } : item,
    );
    persist(lines, current.storeNotes);
    set({ lines });
  },
  remove: (lineKey) => {
    const current = get();
    const lines = current.lines.flatMap((item) => {
      if (item.lineKey !== lineKey) {
        return [item];
      }
      if (item.quantity <= 1) {
        return [];
      }
      return [{ ...item, quantity: item.quantity - 1 }];
    });
    const storeNotes = pruneNotes(lines, current.storeNotes);
    persist(lines, storeNotes);
    set({ lines, storeNotes });
  },
  setNote: (storeId, note) => {
    const storeNotes = pruneNotes(get().lines, { ...get().storeNotes, [storeId]: note });
    persist(get().lines, storeNotes);
    set({ storeNotes });
  },
  clear: () => {
    persist([], {});
    set({ ...emptyCartSnapshot(), hydrated: true });
  },
}));
