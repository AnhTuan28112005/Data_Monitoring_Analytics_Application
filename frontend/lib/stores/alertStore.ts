"use client";

import { create } from "zustand";
import type { Alert } from "@/lib/types";

interface AlertState {
  items: Alert[];
  unread: number;
  push: (a: Alert) => void;
  setMany: (a: Alert[]) => void;
  markAllRead: () => void;
  clear: () => void;
}

export const useAlertStore = create<AlertState>((set) => ({
  items: [],
  unread: 0,
  push: (a) =>
    set((s) => {
      if (s.items.some((x) => x.id === a.id)) return s;
      const items = [a, ...s.items].slice(0, 200);
      return { items, unread: s.unread + 1 };
    }),
  setMany: (arr) =>
    set(() => ({ items: arr.slice(0, 200), unread: 0 })),
  markAllRead: () => set({ unread: 0 }),
  clear: () => set({ items: [], unread: 0 }),
}));
