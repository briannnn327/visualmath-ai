/* =========================================================
   Auth state global (Zustand) — user, login, register, logout
   ========================================================= */

import { create } from "zustand";
import { api } from "@/lib/services/api";
import type { PublicUser, Role } from "@/lib/types";

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: Role;
  nim?: string;
  prodi?: string;
}

interface AuthState {
  user: PublicUser | null;
  initialized: boolean;
  setUser: (user: PublicUser | null) => void;
  hydrate: (user: PublicUser | null) => void;
  login: (email: string, password: string) => Promise<PublicUser>;
  register: (input: RegisterPayload) => Promise<PublicUser>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  initialized: false,

  setUser: (user) => set({ user }),

  hydrate: (user) => set({ user, initialized: true }),

  login: async (email, password) => {
    const { user } = await api.post<{ user: PublicUser }>("/api/auth/login", { email, password });
    set({ user, initialized: true });
    return user;
  },

  register: async (input) => {
    const { user } = await api.post<{ user: PublicUser }>("/api/auth/register", input);
    set({ user, initialized: true });
    return user;
  },

  logout: async () => {
    try {
      await api.post<{ ok?: boolean }>("/api/auth/logout", {});
    } catch {
      /* token sudah kedaluwarsa/hilang — abaikan */
    }
    set({ user: null });
  },
}));