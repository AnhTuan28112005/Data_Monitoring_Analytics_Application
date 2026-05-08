"use client";

import { useState } from "react";
import { useAlertStore } from "@/lib/stores/alertStore";
import { AlertTriangle, Bell, ChevronRight, Trash2, TrendingDown, TrendingUp, Waves, Newspaper, Zap } from "lucide-react";
import { cls } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

const iconFor = (t: string) => {
  switch (t) {
    case "price_spike": return TrendingUp;
    case "price_drop":  return TrendingDown;
    case "whale":       return Waves;
    case "fomo":        return Zap;
    case "divergence":  return AlertTriangle;
    case "news":        return Newspaper;
    default:            return Bell;
  }
};

const colorFor = (sev: string, type: string) => {
  if (type === "price_drop") return "text-accent-red border-accent-red/30 bg-accent-red/5";
  if (type === "price_spike") return "text-accent-green border-accent-green/30 bg-accent-green/5";
  if (sev === "critical") return "text-accent-red border-accent-red/30 bg-accent-red/5";
  if (sev === "warning") return "text-accent-yellow border-accent-yellow/30 bg-accent-yellow/5";
  return "text-accent-cyan border-accent-cyan/30 bg-accent-cyan/5";
};

export function AlertFeed() {
  const items = useAlertStore((s) => s.items);
  const clear = useAlertStore((s) => s.clear);
  const markAllRead = useAlertStore((s) => s.markAllRead);
  const unread = useAlertStore((s) => s.unread);
  const [open, setOpen] = useState(true);

  return (
    <>
      <button
        onClick={() => { setOpen(!open); markAllRead(); }}
        className="lg:hidden fixed bottom-4 right-4 z-40 bg-accent-cyan text-bg-base font-semibold rounded-full px-4 py-2 shadow-glow flex items-center gap-2"
      >
        <Bell className="w-4 h-4" /> {unread > 0 ? `${unread} new` : "Alerts"}
      </button>
      <aside
        className={cls(
          "fixed lg:static right-0 top-0 h-full lg:h-auto z-40 w-80 shrink-0",
          "border-l border-line/60 bg-bg-panel/80 backdrop-blur-md",
          "transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        )}
      >
        <div className="p-4 border-b border-line/60 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest text-text-muted">Live</div>
            <div className="font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent-red animate-pulse_dot" />
              Alert Feed
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={clear}
              className="text-text-muted hover:text-white p-1.5 rounded-md hover:bg-bg-elev"
              title="Clear feed"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              className="lg:hidden text-text-muted hover:text-white p-1.5 rounded-md hover:bg-bg-elev"
              onClick={() => setOpen(false)}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="overflow-y-auto h-[calc(100vh-9rem)] p-3 space-y-2">
          {items.length === 0 && (
            <div className="text-center text-sm text-text-muted py-12">
              <Bell className="w-6 h-6 mx-auto mb-2 opacity-50" />
              Waiting for live alerts...
            </div>
          )}
          {items.map((a) => {
            const Icon = iconFor(a.type);
            return (
              <div
                key={a.id}
                className={cls(
                  "rounded-xl border p-3 text-sm",
                  colorFor(a.severity, a.type)
                )}
              >
                <div className="flex items-start gap-2">
                  <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider opacity-80">
                      <span>{a.type.replace("_", " ")}</span>
                      {a.symbol && <span className="text-white">· {a.symbol}</span>}
                      <span className="ml-auto text-text-muted">
                        {(() => {
                          try { return formatDistanceToNow(new Date(a.timestamp), { addSuffix: true }); }
                          catch { return ""; }
                        })()}
                      </span>
                    </div>
                    <div className="text-text-primary leading-snug mt-1 break-words">
                      {a.detail?.url ? (
                        <a href={a.detail.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                          {a.message}
                        </a>
                      ) : a.message}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </aside>
    </>
  );
}
