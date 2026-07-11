import { create } from "zustand";
import type { EarthquakeOut, GlobeStats } from "../api/earthquakes";

interface AppState {
  depthLayer: number;
  stats: GlobeStats | null;
  selectedEarthquake: EarthquakeOut | null;

  setDepthLayer: (layer: number) => void;
  setStats: (stats: GlobeStats) => void;
  selectEarthquake: (eq: EarthquakeOut | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  depthLayer: 0,
  stats: null,
  selectedEarthquake: null,

  setDepthLayer: (layer) => set({ depthLayer: layer, selectedEarthquake: null }),
  setStats: (stats) => set({ stats }),
  selectEarthquake: (eq) => set({ selectedEarthquake: eq }),
}));
