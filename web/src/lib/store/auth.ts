/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type User = {
  id: string;
  email: string;
  display_name?: string | null;
};

type AuthState = {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      loading: false,
      setUser: (user) => set({ user }),
      setLoading: (loading) => set({ loading }),
      logout: async () => {
        try {
          await fetch("/api/auth/logout", { method: "POST" });
        } catch (e) {
          // ignore
        }
        set({ user: null });
      },
      refresh: async () => {
        set({ loading: true });
        try {
          const res = await fetch("/api/auth/me", { cache: "no-store" });
          const data = await res.json();
          set({ user: data.user, loading: false });
        } catch (e) {
          set({ user: null, loading: false });
        }
      },
    }),
    { name: "naninne-auth" }
  )
);
