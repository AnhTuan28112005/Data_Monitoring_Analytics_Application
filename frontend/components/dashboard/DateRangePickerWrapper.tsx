"use client";

import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { useDateRangeStore } from "@/lib/stores/dateRangeStore";

export function DateRangePickerWrapper() {
  const { setDateRange } = useDateRangeStore();

  return (
    <div className="bg-bg-elev border border-line/40 rounded-lg p-3 md:p-4">
      <p className="text-xs md:text-sm text-text-secondary mb-2">Date Range:</p>
      <DateRangePicker onRangeChange={setDateRange} defaultRange="1m" />
    </div>
  );
}
