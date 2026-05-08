"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, BarChart3, FileText, LineChart, Wallet } from "lucide-react";
import { cls } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Dashboard", icon: Activity },
  { href: "/insights", label: "Daily Insight", icon: FileText },
  { href: "/analytics", label: "Analytics", icon: LineChart },
  { href: "/portfolio", label: "Portfolio", icon: Wallet },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-line/60 bg-bg-panel/60 backdrop-blur-md">
      <div className="px-5 py-5 flex items-center gap-2 border-b border-line/50">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-cyan to-accent-purple flex items-center justify-center shadow-glow">
          <BarChart3 className="w-5 h-5 text-bg-base" />
        </div>
        <div>
          <div className="font-bold tracking-wide">World Monitor</div>
          <div className="text-[10px] text-text-muted uppercase tracking-widest">Market Intelligence</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cls(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all",
                active
                  ? "bg-bg-elev text-white shadow-glass"
                  : "text-text-secondary hover:bg-bg-elev/50 hover:text-white"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 text-[10px] text-text-muted border-t border-line/50">
        v1.0.0 · Real-time data
      </div>
    </aside>
  );
}
