"use client";

import { PortfolioTracker } from "@/components/dashboard/PortfolioTracker";
import { Card } from "@/components/ui/Card";

export default function PortfolioPage() {
  return (
    <div className="space-y-4">
      <Card title="About Portfolio Tracking">
        <p className="text-sm text-text-secondary leading-relaxed">
          Track unrealised profit/loss across crypto, stocks, indexes, gold, silver and forex with live prices
          fed from the World Monitor real-time engine. Holdings are stored locally in your browser
          (no server account required) and PnL is recomputed against live ticks the moment they arrive.
        </p>
      </Card>
      <PortfolioTracker />
    </div>
  );
}
