"use client";

import { useEffect, useRef, useState } from "react";
import { cls, fmtPrice } from "@/lib/utils";

/**
 * FlashNumber renders a numeric value and briefly flashes green/red whenever
 * the value increases or decreases vs the previous render — the classic
 * Bloomberg-style price tape effect.
 */
export function FlashNumber({
  value,
  className,
  formatter = fmtPrice,
}: {
  value: number;
  className?: string;
  formatter?: (n: number) => string;
}) {
  const prev = useRef<number | null>(null);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    if (prev.current !== null && prev.current !== value) {
      const dir = value > prev.current ? "up" : "down";
      setFlash(dir);
      const id = setTimeout(() => setFlash(null), 900);
      prev.current = value;
      return () => clearTimeout(id);
    }
    prev.current = value;
  }, [value]);

  return (
    <span
      className={cls(
        "px-1.5 py-0.5 rounded num-tabular transition-colors",
        flash === "up" && "animate-flashGreen",
        flash === "down" && "animate-flashRed",
        className
      )}
    >
      {formatter(value)}
    </span>
  );
}
