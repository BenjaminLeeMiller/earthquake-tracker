import { create } from "zustand";
import type { EarthquakeOut, GlobeStats } from "../api/earthquakes";

interface AppState {
  stats: GlobeStats | null;
  selectedEarthquake: EarthquakeOut | null;
  timeRange: [number, number] | null;

  setStats: (stats: GlobeStats) => void;
  selectEarthquake: (eq: EarthquakeOut | null) => void;
  setTimeRange: (range: [number, number]) => void;
}

export const useAppStore = create<AppState>((set) => ({
  stats: null,
  selectedEarthquake: null,
  timeRange: null,

  setStats: (stats) => set({ stats }),
  selectEarthquake: (eq) => set({ selectedEarthquake: eq }),
  setTimeRange: (range) => set({ timeRange: range }),
}));
