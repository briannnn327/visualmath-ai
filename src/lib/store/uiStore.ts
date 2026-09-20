/* =========================================================
   UI state global (Zustand) — sidebar, navigasi mobile, pencarian
   ========================================================= */

import { create } from "zustand";

interface UIState {
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;
  searchQuery: string;
  toggleSidebar: () => void;
  setMobileNavOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  mobileNavOpen: false,
  searchQuery: "",
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
  setSearchQuery: (query) => set({ searchQuery: query }),
}));
