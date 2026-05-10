"use client";

import { useEffect, useState } from "react";
import { Activity, Bell, Search } from "lucide-react";
import { useAlertStore } from "@/lib/stores/alertStore";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export function TopBar() {
  const unread = useAlertStore((s) => s.unread);
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
      <div className="md:hidden font-bold">World Monitor</div>
      <div className="hidden md:flex items-center gap-2 flex-1 max-w-md">
        <div className="flex items-center gap-2 w-full bg-bg-elev/60 px-3 py-2 rounded-xl border border-line/60">
          <Search className="w-4 h-4 text-text-muted" />
          <input
            placeholder="Search asset (BTC, ETH, AAPL, XAU/USD)..."
            className="bg-transparent outline-none text-sm flex-1 placeholder:text-text-muted"
          />
        </div>
      </div>
      <div className="flex items-center gap-3 ml-auto">
        <div className="hidden sm:flex items-center gap-2 text-xs text-text-secondary">
          <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse_dot" />
          <span>Live</span>
          <span className="num-tabular text-text-primary">{now}</span>
        </div>
        <ThemeToggle />
        <div className="relative">
          <Bell className="w-5 h-5 text-text-secondary" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 bg-accent-red text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </div>
        <div className="hidden sm:flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-accent-green/10 text-accent-green">
          <Activity className="w-3.5 h-3.5" /> Real-time
        </div>
      </div>
    </header>
  );
}
