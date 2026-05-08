"use client";

import { useEffect, useRef } from "react";
import { useMarketStore } from "@/lib/stores/marketStore";
import { useAlertStore } from "@/lib/stores/alertStore";
import type { Alert, PriceTick } from "@/lib/types";

const WS_BASE =
  process.env.NEXT_PUBLIC_BACKEND_WS ||
  (typeof window !== "undefined"
    ? (window.location.protocol === "https:" ? "wss://" : "ws://") + window.location.host
    : "ws://localhost:8000");

function connectWs(url: string, handlers: { onMessage: (data: any) => void }) {
  let ws: WebSocket | null = null;
  let stopped = false;
  let retry = 0;

  const open = () => {
    ws = new WebSocket(url);
    ws.onopen = () => {
      retry = 0;
    };
    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        handlers.onMessage(data);
      } catch {
        // ignore non-JSON
      }
    };
    ws.onerror = () => {};
    ws.onclose = () => {
      if (stopped) return;
      retry = Math.min(retry + 1, 6);
      setTimeout(open, 500 * 2 ** retry);
    };
  };
  open();
  return () => {
    stopped = true;
    ws?.close();
  };
}

export function useMarketWebSocket() {
  const setSnapshot = useMarketStore((s) => s.setSnapshot);
  const upsert = useMarketStore((s) => s.upsert);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const url = `${WS_BASE}/ws/market`;
    return connectWs(url, {
      onMessage: (data) => {
        if (data.type === "snapshot" && Array.isArray(data.ticks)) {
          setSnapshot(data.ticks as PriceTick[]);
        } else if (data.type === "tick" && data.tick) {
          upsert(data.tick as PriceTick);
        }
      },
    });
  }, [setSnapshot, upsert]);
}

export function useAlertsStream() {
  const push = useAlertStore((s) => s.push);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    // Prefer SSE (one-way; auto-reconnects in browser); fall back to WS on error.
    const sseUrl = "/sse/alerts"; // same-origin via Next rewrite
    let es: EventSource | null = null;
    let stopWs: (() => void) | null = null;

    try {
      es = new EventSource(sseUrl);
      es.addEventListener("alert", (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data) as Alert;
          push(data);
        } catch {}
      });
      es.onerror = () => {
        if (es) {
          es.close();
          es = null;
        }
        if (!stopWs) {
          stopWs = connectWs(`${WS_BASE}/ws/alerts`, {
            onMessage: (data) => {
              if (data && data.id && data.type) push(data as Alert);
            },
          });
        }
      };
    } catch {
      stopWs = connectWs(`${WS_BASE}/ws/alerts`, {
        onMessage: (data) => {
          if (data && data.id && data.type) push(data as Alert);
        },
      });
    }

    return () => {
      es?.close();
      stopWs?.();
    };
  }, [push]);
}
