import { create } from "zustand";

import type { SessionUser } from "@/lib/auth/client";

interface SessionState {
  user: SessionUser | null;
  loaded: boolean;
  setUser: (user: SessionUser | null) => void;
  setLoaded: (loaded: boolean) => void;
}

export const useSessionStore = create<SessionState>()((set) => ({
  user: null,
  loaded: false,
  setUser: (user) => set({ user }),
  setLoaded: (loaded) => set({ loaded }),
}));
