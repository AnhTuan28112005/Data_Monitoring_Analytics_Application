"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import dynamic from "next/dynamic";
import type { HeatmapResponse } from "@/lib/types";

import Plot from "@/components/charts/PlotlyClient";

export function SectorHeatmap() {
  const [data, setData] = useState<HeatmapResponse | null>(null);

  useEffect(() => {
    const load = () => api.heatmap().then(setData).catch(() => {});
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []);

  const trace = useMemo(() => {
    if (!data || data.cells.length === 0) return null;
    const labels = data.cells.map((c) => c.symbol);
    const parents = data.cells.map((c) => c.sector);
    const values = data.cells.map((c) => Math.max(1, Math.abs(c.market_cap ?? c.price ?? 1)));
    const colors = data.cells.map((c) => c.change_pct);
    const text = data.cells.map(
      (c) => `${c.symbol}<br>${c.change_pct >= 0 ? "+" : ""}${c.change_pct.toFixed(2)}%`
    );

    // Build distinct sector parents only once
    const sectorSet = Array.from(new Set(parents));
    const allLabels = [...sectorSet, ...labels];
    const allParents = [...sectorSet.map(() => ""), ...parents];
    const allValues = [...sectorSet.map(() => 0), ...values];
    const allColors: (number | null)[] = [...sectorSet.map(() => null), ...colors];
    const allText = [...sectorSet, ...text];

    return {
      type: "treemap" as const,
      labels: allLabels,
      parents: allParents,
      values: allValues,
      text: allText,
      textinfo: "text" as any,
      hovertemplate: "%{label}<br>%{customdata:+.2f}%<extra></extra>",
      customdata: [...sectorSet.map(() => 0), ...colors],
      marker: {
        colors: allColors,
        colorscale: [
          [0, "#ea3943"],
          [0.5, "#1a2438"],
          [1, "#16c784"],
        ],
        cmid: 0,
        cmin: -10,
        cmax: 10,
        line: { color: "#0a0e17", width: 1 },
      },
    };
  }, [data]);

  const bestSector = (data && data.cells.length > 0) ? data.cells.reduce((best, cell) =>
    cell.change_pct > best.change_pct ? cell : best
  ) : null;
  const worstSector = (data && data.cells.length > 0) ? data.cells.reduce((worst, cell) =>
    cell.change_pct < worst.change_pct ? cell : worst
  ) : null;

  return (
    <Card title="Sector Performance Heatmap">
      {trace ? (
        <>
          <Plot
            data={[trace]}
            layout={{
              margin: { t: 10, l: 0, r: 0, b: 0 },
              paper_bgcolor: "transparent",
              plot_bgcolor: "transparent",
              font: { color: "#e6edf7", size: 11 },
              height: 360,
              autosize: true,
            }}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: "100%", height: "360px" }}
            useResizeHandler
          />
          <div className="mt-3 p-2 bg-bg-card/50 border border-line/40 rounded text-xs text-text-secondary">
            <p className="text-[10px] uppercase text-text-muted mb-1">Sector Analysis</p>
            <p>Cryptocurrency sector performance visualized by size and color. {bestSector && <span>Best: <span className="text-accent-green font-semibold">{bestSector.symbol}</span> at {bestSector.change_pct.toFixed(2)}%</span>}. {worstSector && <span>Worst: <span className="text-accent-red font-semibold">{worstSector.symbol}</span> at {worstSector.change_pct.toFixed(2)}%</span>}.</p>
          </div>
        </>
      ) : (
        <div className="text-sm text-text-muted h-[360px] flex items-center justify-center">Loading sectors…</div>
      )}
    </Card>
  );
}
