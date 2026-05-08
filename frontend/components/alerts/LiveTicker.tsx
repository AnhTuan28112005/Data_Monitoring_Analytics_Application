"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { NewsItem } from "@/lib/types";
import { Newspaper } from "lucide-react";

export function LiveTicker() {
  const [news, setNews] = useState<NewsItem[]>([]);

  useEffect(() => {
    const load = () =>
      api
        .news(20)
        .then((items) => setNews(items))
        .catch(() => {});
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  if (news.length === 0) {
    return (
      <div className="px-4 md:px-6 py-2 border-b border-line/50 bg-bg-panel/40 text-xs text-text-muted">
        Loading market news...
      </div>
    );
  }

  // Render the items twice so the CSS marquee loop is seamless.
  const items = [...news, ...news];

  return (
    <div className="border-b border-line/50 bg-bg-panel/40 overflow-hidden">
      <div className="flex items-center gap-3 py-1.5 px-4 md:px-6">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-accent-cyan shrink-0">
          <Newspaper className="w-3.5 h-3.5" /> EVENTS
        </div>
        <div className="overflow-hidden flex-1">
          <div className="marquee-track animate-marquee">
            {items.map((n, i) => (
              <a
                key={`${n.id}-${i}`}
                href={n.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 text-xs text-text-secondary hover:text-white transition-colors"
              >
                <span className="text-accent-yellow mr-2">[{n.source}]</span>
                {n.title}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
