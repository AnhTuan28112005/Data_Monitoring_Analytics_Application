"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AssetClass, PortfolioHolding } from "@/lib/types";

interface PortfolioState {
  holdings: PortfolioHolding[];
  add: (h: PortfolioHolding) => void;
  update: (i: number, h: Partial<PortfolioHolding>) => void;
  remove: (i: number) => void;
  reset: () => void;
}

const DEFAULTS: PortfolioHolding[] = [
  { symbol: "BTC/USDT", asset_class: "crypto" as AssetClass, quantity: 0.5, cost_basis: 45000 },
  { symbol: "ETH/USDT", asset_class: "crypto" as AssetClass, quantity: 4, cost_basis: 2500 },
  { symbol: "AAPL", asset_class: "stock" as AssetClass, quantity: 20, cost_basis: 170 },
];

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set) => ({
      holdings: DEFAULTS,
      add: (h) => set((s) => ({ holdings: [...s.holdings, h] })),
      update: (i, h) =>
        set((s) => ({
          holdings: s.holdings.map((row, idx) => (idx === i ? { ...row, ...h } : row)),
        })),
      remove: (i) => set((s) => ({ holdings: s.holdings.filter((_, idx) => idx !== i) })),
      reset: () => set({ holdings: DEFAULTS }),
    }),
    { name: "wm-portfolio" }
  )
);
