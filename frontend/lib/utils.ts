import clsx from "clsx";

export const cls = clsx;

export function fmtNumber(n: number | null | undefined, digits = 2): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000_000) return (n / 1_000_000_000_000).toFixed(2) + "T";
  if (abs >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + "B";
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (abs >= 1_000) return (n / 1_000).toFixed(2) + "K";
  return n.toLocaleString(undefined, { maximumFractionDigits: digits });
}

export function fmtPrice(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const abs = Math.abs(n);
  let digits = 2;
  if (abs < 1) digits = 4;
  if (abs < 0.01) digits = 6;
  return n.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

export function fmtPct(n: number | null | undefined, digits = 2): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(digits)}%`;
}

export function colorByChange(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "text-text-secondary";
  if (n > 0) return "text-accent-green";
  if (n < 0) return "text-accent-red";
  return "text-text-secondary";
}

export function pctToHeat(pct: number): string {
  // Map [-10..10] to a tailwind-like color; used by heatmap cells
  const clamped = Math.max(-10, Math.min(10, pct));
  if (clamped > 0) {
    const a = Math.min(0.85, 0.15 + clamped / 12);
    return `rgba(22, 199, 132, ${a})`;
  }
  if (clamped < 0) {
    const a = Math.min(0.85, 0.15 + Math.abs(clamped) / 12);
    return `rgba(234, 57, 67, ${a})`;
  }
  return "rgba(127, 127, 127, 0.15)";
}
