"use client";

import { useEffect, useState } from "react";
import { Activity, Bell, TrendingUp } from "lucide-react";
import { useAlertStore } from "@/lib/stores/alertStore";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

import { useMarketStore } from "@/lib/stores/marketStore";

export function TopBar() {
  const unread = useAlertStore((s) => s.unread);
  const markAllRead = useAlertStore((s) => s.markAllRead);
  const ticks = useMarketStore((s) => Object.values(s.ticks)).slice(0, 5);
  const [now, setNow] = useState<string>("");

  useEffect(() => {
    const update = () =>
      setNow(
        new Date().toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="sticky top-0 z-30 px-4 md:px-6 py-3 flex items-center gap-4 bg-bg-base/70 backdrop-blur-md border-b border-line/60">
      <a href="/" className="flex items-center gap-2 font-bold shrink-0 hover:text-accent-cyan transition-colors">
        <div className="bg-accent-cyan/20 p-1.5 rounded-lg">
          <TrendingUp className="w-5 h-5 text-accent-cyan" />
        </div>
        <span className="hidden sm:inline text-lg font-bold tracking-tight uppercase">Market Intelligence</span>
      </a>

      {/* Live Ticker Tape */}
      <div className="hidden lg:flex flex-1 items-center justify-center overflow-hidden px-10">
        <div className="flex items-center gap-8 animate-marquee whitespace-nowrap">
          {[...ticks, ...ticks].map((t, i) => (
            <div key={`${t.symbol}-${i}`} className="flex items-center gap-2 text-xs">
              <span className="text-text-secondary font-medium">{t.symbol.replace("/USDT", "")}</span>
              <span className="num-tabular font-bold">${t.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              <span className={t.change_24h_pct >= 0 ? "text-accent-green" : "text-accent-red"}>
                {t.change_24h_pct >= 0 ? "▲" : "▼"} {Math.abs(t.change_24h_pct).toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 ml-auto shrink-0">
        <div className="hidden sm:flex items-center gap-2 text-xs text-text-secondary mr-2">
          <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse_dot" />
          <span>Live</span>
          <span className="num-tabular text-text-primary">{now}</span>
        </div>
        <ThemeToggle />
        <button 
          onClick={markAllRead}
          className="relative p-1.5 hover:bg-bg-elev rounded-lg transition-colors group"
          title="Mark all as read"
        >
          <Bell className="w-5 h-5 text-text-secondary group-hover:text-text-primary" />
          {unread > 0 && (
            <span className="absolute top-0 right-0 bg-accent-red text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center border-2 border-bg-base">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
        <div className="hidden sm:flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-accent-green/10 text-accent-green font-medium">
          <Activity className="w-3.5 h-3.5" /> Real-time
        </div>
      </div>
    </header>
  );
}
