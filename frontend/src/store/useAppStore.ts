import { create } from "zustand";
import type { EarthquakeOut, GlobeStats } from "../api/earthquakes";

interface AppState {
  stats: GlobeStats | null;
  selectedEarthquake: EarthquakeOut | null;

  setStats: (stats: GlobeStats) => void;
  selectEarthquake: (eq: EarthquakeOut | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  stats: null,
  selectedEarthquake: null,

  setStats: (stats) => set({ stats }),
  selectEarthquake: (eq) => set({ selectedEarthquake: eq }),
}));
