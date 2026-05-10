"use client";

import { useState } from "react";
import { format, subDays, subMonths, startOfDay } from "date-fns";
import { cls } from "@/lib/utils";

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

interface DateRangePickerProps {
  onRangeChange: (range: DateRange) => void;
  defaultRange?: "1d" | "1w" | "1m" | "3m" | "6m" | "1y" | "custom";
}

const PRESETS = [
  { label: "1D", key: "1d", getDates: () => ({ startDate: subDays(new Date(), 1), endDate: new Date() }) },
  { label: "1W", key: "1w", getDates: () => ({ startDate: subDays(new Date(), 7), endDate: new Date() }) },
  { label: "1M", key: "1m", getDates: () => ({ startDate: subMonths(new Date(), 1), endDate: new Date() }) },
  { label: "3M", key: "3m", getDates: () => ({ startDate: subMonths(new Date(), 3), endDate: new Date() }) },
  { label: "6M", key: "6m", getDates: () => ({ startDate: subMonths(new Date(), 6), endDate: new Date() }) },
  { label: "1Y", key: "1y", getDates: () => ({ startDate: subMonths(new Date(), 12), endDate: new Date() }) },
];

export function DateRangePicker({ onRangeChange, defaultRange = "1m" }: DateRangePickerProps) {
  const [selected, setSelected] = useState<string>(defaultRange);
  const [showCustom, setShowCustom] = useState(false);
  const [customStart, setCustomStart] = useState(format(subMonths(new Date(), 1), "yyyy-MM-dd"));
  const [customEnd, setCustomEnd] = useState(format(new Date(), "yyyy-MM-dd"));

  const handlePresetClick = (key: string) => {
    setSelected(key);
    setShowCustom(false);
    const preset = PRESETS.find((p) => p.key === key);
    if (preset) {
      onRangeChange(preset.getDates());
    }
  };

  const handleCustom = () => {
    setSelected("custom");
    setShowCustom(true);
    const startDate = new Date(customStart);
    const endDate = new Date(customEnd);
    onRangeChange({ startDate, endDate });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 bg-bg-elev border border-line/60 rounded-lg p-2 flex-wrap">
        {PRESETS.map((preset) => (
          <button
            key={preset.key}
            onClick={() => handlePresetClick(preset.key)}
            className={cls(
              "px-3 md:px-4 py-2 text-xs md:text-sm rounded-md uppercase transition-colors flex-1 md:flex-none min-w-0 font-medium",
              selected === preset.key
                ? "bg-accent-cyan text-bg-base font-semibold"
                : "text-text-secondary hover:text-white border border-line/40"
            )}
          >
            {preset.label}
          </button>
        ))}
        <button
          onClick={() => {
            setShowCustom(!showCustom);
            if (!showCustom) setSelected("custom");
          }}
          className={cls(
            "px-3 md:px-4 py-2 text-xs md:text-sm rounded-md uppercase transition-colors flex-1 md:flex-none min-w-0 font-medium",
            selected === "custom"
              ? "bg-accent-cyan text-bg-base font-semibold"
              : "text-text-secondary hover:text-white border border-line/40"
          )}
        >
          Custom
        </button>
      </div>

      {/* Custom date inputs */}
      {showCustom && (
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 bg-bg-elev border border-line/60 rounded-lg p-3">
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="bg-bg-base border border-line/40 rounded px-3 py-2 text-sm text-text-primary"
          />
          <span className="text-text-secondary text-sm hidden md:inline">→</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="bg-bg-base border border-line/40 rounded px-3 py-2 text-sm text-text-primary"
          />
          <button
            onClick={handleCustom}
            className="px-4 py-2 text-sm bg-accent-cyan text-bg-base rounded font-semibold hover:opacity-80 w-full md:w-auto"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
