import { create } from "zustand";
import type { EarthquakeOut, GlobeStats } from "../api/earthquakes";
import { MAX_MAG } from "../utils/magnitude";

// Default filter starting points on load (the sliders' own min/max bounds
// are unaffected — these just narrow the initial view).
const DEFAULT_MIN_MAGNITUDE = 2.5;

// Add new fault-line datasets here as they're introduced — the store shape,
// FaultLines renderer, and FaultLayersMenu all key off this union, so a new
// dataset only needs a new key here, an entry in FAULT_LAYER_LABELS, and one
// more <FaultLines> instance in GlobeCanvas.
export type FaultLayerKey = "plateBoundaries";

interface AppState {
  stats: GlobeStats | null;
  selectedEarthquake: EarthquakeOut | null;
  timeRange: [number, number] | null;
  magRange: [number, number];
  // Governs three things together: globe opacity, far-side quake
  // visibility, and far-side fault-line visibility. Checked (default):
  // translucent globe, everything visible. Unchecked: opaque globe,
  // far-side quakes and fault-line segments hidden.
  translucentGlobe: boolean;
  faultLayers: Record<FaultLayerKey, boolean>;

  setStats: (stats: GlobeStats) => void;
  selectEarthquake: (eq: EarthquakeOut | null) => void;
  setTimeRange: (range: [number, number]) => void;
  setMagRange: (range: [number, number]) => void;
  setTranslucentGlobe: (translucent: boolean) => void;
  setFaultLayer: (key: FaultLayerKey, value: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  stats: null,
  selectedEarthquake: null,
  timeRange: null,
  magRange: [DEFAULT_MIN_MAGNITUDE, MAX_MAG],
  translucentGlobe: true,
  faultLayers: { plateBoundaries: true },

  setStats: (stats) => set({ stats }),
  selectEarthquake: (eq) => set({ selectedEarthquake: eq }),
  setTimeRange: (range) => set({ timeRange: range }),
  setMagRange: (range) => set({ magRange: range }),
  setTranslucentGlobe: (translucent) => set({ translucentGlobe: translucent }),
  setFaultLayer: (key, value) => set((s) => ({ faultLayers: { ...s.faultLayers, [key]: value } })),
}));
