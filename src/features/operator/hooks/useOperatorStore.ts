"use client";

import { create } from "zustand";
import type { OperatorReportFilter } from "@/features/operator/lib/dto";

type OperatorStoreState = {
  selectedReportId: string | null;
  filters: OperatorReportFilter;
};

type OperatorStoreActions = {
  setSelectedReportId: (reportId: string | null) => void;
  updateFilters: (updater: (prev: OperatorReportFilter) => OperatorReportFilter) => void;
  resetFilters: () => void;
};

const initialFilters: OperatorReportFilter = {};

export const useOperatorStore = create<OperatorStoreState & OperatorStoreActions>(
  (set) => ({
    selectedReportId: null,
    filters: initialFilters,
    setSelectedReportId: (reportId) => set({ selectedReportId: reportId }),
    updateFilters: (updater) =>
      set((state) => ({
        filters: updater(state.filters),
      })),
    resetFilters: () => set({ filters: initialFilters }),
  }),
);

