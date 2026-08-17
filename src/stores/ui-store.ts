"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { setAudioMuted as setEngineMuted } from "@/lib/audio";

interface UiState {
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;
  audioMuted: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setMobileNavOpen: (open: boolean) => void;
  setAudioMuted: (muted: boolean) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      mobileNavOpen: false,
      audioMuted: false,
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
      setAudioMuted: (muted) => {
        setEngineMuted(muted);
        set({ audioMuted: muted });
      },
    }),
    {
      name: "sd-ui",
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        audioMuted: state.audioMuted,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          setEngineMuted(state.audioMuted);
        }
      },
    },
  ),
);
