"use client";

import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { useDateRangeStore } from "@/lib/stores/dateRangeStore";

export function DateRangePickerWrapper({ hideCustom = false }: { hideCustom?: boolean }) {
  const { setDateRange } = useDateRangeStore();

  return (
    <div className="bg-bg-elev border border-line/40 rounded-lg p-3 md:p-4">
      <div className="mb-2">
        <p className="text-xs md:text-sm text-text-secondary font-medium">Global Analysis Window</p>
        <p className="text-[10px] text-text-muted italic">Sets the total historical period for all dashboard calculations.</p>
      </div>
      <DateRangePicker onRangeChange={setDateRange} defaultRange="1m" hideCustom={hideCustom} />
    </div>
  );
}
