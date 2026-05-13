import { create } from "zustand";
import { subMonths } from "date-fns";

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

interface DateRangeStore {
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  resetToDefault: () => void;
}

const DEFAULT_RANGE: DateRange = {
  startDate: subMonths(new Date(), 1),
  endDate: new Date(),
};

export const useDateRangeStore = create<DateRangeStore>((set) => ({
  dateRange: DEFAULT_RANGE,
  setDateRange: (range) => set({ dateRange: range }),
  resetToDefault: () => set({ dateRange: DEFAULT_RANGE }),
}));
