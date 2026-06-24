import { create } from "zustand";

type InterfaceState = {
  compactStatistics: boolean;
  setCompactStatistics: (compactStatistics: boolean) => void;
};

export const useInterfaceStore = create<InterfaceState>((set) => ({
  compactStatistics: false,
  setCompactStatistics: (compactStatistics) => set({ compactStatistics }),
}));
