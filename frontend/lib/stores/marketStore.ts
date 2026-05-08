"use client";

import { create } from "zustand";
import type { PriceTick } from "@/lib/types";

interface MarketState {
  ticks: Record<string, PriceTick>;        // key = "<asset_class>:<symbol>"
  lastDir: Record<string, "up" | "down" | null>; // last price flash direction
  setSnapshot: (ticks: PriceTick[]) => void;
  upsert: (tick: PriceTick) => void;
  get: (key: string) => PriceTick | undefined;
}

export const useMarketStore = create<MarketState>((set, get) => ({
  ticks: {},
  lastDir: {},
  setSnapshot: (ticks) =>
    set((state) => {
      const next = { ...state.ticks };
      const dir = { ...state.lastDir };
      for (const t of ticks) {
        const k = `${t.asset_class}:${t.symbol}`;
        const prev = next[k];
        next[k] = t;
        if (prev && prev.price !== t.price) {
          dir[k] = t.price > prev.price ? "up" : "down";
        } else if (!prev) {
          dir[k] = null;
        }
      }
      return { ticks: next, lastDir: dir };
    }),
  upsert: (t) =>
    set((state) => {
      const k = `${t.asset_class}:${t.symbol}`;
      const prev = state.ticks[k];
      const dir =
        prev && prev.price !== t.price
          ? prev.price < t.price
            ? "up"
            : "down"
          : state.lastDir[k] ?? null;
      return {
        ticks: { ...state.ticks, [k]: t },
        lastDir: { ...state.lastDir, [k]: dir },
      };
    }),
  get: (key) => get().ticks[key],
}));
