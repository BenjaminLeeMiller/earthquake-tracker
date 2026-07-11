import { create } from "zustand";
import type { EarthquakeOut, GlobeStats } from "../api/earthquakes";
import { MAX_MAG } from "../utils/magnitude";

// Default filter starting points on load (the sliders' own min/max bounds
// are unaffected — these just narrow the initial view).
const DEFAULT_MIN_MAGNITUDE = 2.5;

interface AppState {
  stats: GlobeStats | null;
  selectedEarthquake: EarthquakeOut | null;
  timeRange: [number, number] | null;
  magRange: [number, number];
  translucentGlobe: boolean;
  hideFarSide: boolean;

  setStats: (stats: GlobeStats) => void;
  selectEarthquake: (eq: EarthquakeOut | null) => void;
  setTimeRange: (range: [number, number]) => void;
  setMagRange: (range: [number, number]) => void;
  setTranslucentGlobe: (translucent: boolean) => void;
  setHideFarSide: (hide: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  stats: null,
  selectedEarthquake: null,
  timeRange: null,
  magRange: [DEFAULT_MIN_MAGNITUDE, MAX_MAG],
  translucentGlobe: true,
  hideFarSide: false,

  setStats: (stats) => set({ stats }),
  selectEarthquake: (eq) => set({ selectedEarthquake: eq }),
  setTimeRange: (range) => set({ timeRange: range }),
  setMagRange: (range) => set({ magRange: range }),
  setTranslucentGlobe: (translucent) => set({ translucentGlobe: translucent }),
  setHideFarSide: (hide) => set({ hideFarSide: hide }),
}));
