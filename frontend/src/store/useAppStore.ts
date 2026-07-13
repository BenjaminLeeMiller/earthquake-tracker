import { create } from "zustand";
import type { EarthquakeOut, GlobeStats } from "../api/earthquakes";
import type { VolcanoRecord } from "../types/volcano";
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
  selectedVolcano: VolcanoRecord | null;
  timeRange: [number, number] | null;
  magRange: [number, number];
  // Governs three things together: globe opacity, far-side quake
  // visibility, and far-side fault-line visibility. Checked: translucent
  // globe, everything visible. Unchecked (default): opaque globe,
  // far-side quakes and fault-line segments hidden.
  translucentGlobe: boolean;
  faultLayers: Record<FaultLayerKey, boolean>;
  // Static volcano-location marker layer — a reference/context layer like
  // faultLayers, not an opt-in rendering mode like translucentGlobe, so it
  // defaults on.
  volcanoesVisible: boolean;

  // "Radar loop" replay: sweeps the currently selected timeRange window,
  // revealing quakes at full opacity as the clock passes their occurred_at,
  // then fading them out (see MAG_BUCKET_FADE_DURATIONS_MS in magnitude.ts).
  isPlaying: boolean;
  playbackTime: number | null; // epoch ms; null = not yet started
  playbackSpeedDaysPerSec: number;

  // True while a manual USGS refresh (triggered from StatsPanel) is in
  // flight. dataVersion increments once it completes — EarthquakeLayer
  // depends on it to know when to refetch the full quake list, since its
  // own mount-only effect has no other way to learn the backend re-ingested.
  refreshing: boolean;
  dataVersion: number;

  setStats: (stats: GlobeStats) => void;
  selectEarthquake: (eq: EarthquakeOut | null) => void;
  selectVolcano: (v: VolcanoRecord | null) => void;
  setTimeRange: (range: [number, number]) => void;
  setMagRange: (range: [number, number]) => void;
  setTranslucentGlobe: (translucent: boolean) => void;
  setFaultLayer: (key: FaultLayerKey, value: boolean) => void;
  setVolcanoesVisible: (visible: boolean) => void;
  setIsPlaying: (playing: boolean) => void;
  setPlaybackTime: (time: number | null) => void;
  setPlaybackSpeed: (daysPerSec: number) => void;
  setRefreshing: (refreshing: boolean) => void;
  bumpDataVersion: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  stats: null,
  selectedEarthquake: null,
  selectedVolcano: null,
  timeRange: null,
  magRange: [DEFAULT_MIN_MAGNITUDE, MAX_MAG],
  translucentGlobe: false,
  faultLayers: { plateBoundaries: true },
  volcanoesVisible: true,
  isPlaying: false,
  playbackTime: null,
  playbackSpeedDaysPerSec: 1,
  refreshing: false,
  dataVersion: 0,

  setStats: (stats) => set({ stats }),
  // Earthquake and volcano selection are mutually exclusive — both detail
  // panels share the same sidebar space, so selecting one clears the other
  // (but deselecting, i.e. passing null, leaves an unrelated selection
  // alone).
  selectEarthquake: (eq) => set((s) => ({ selectedEarthquake: eq, selectedVolcano: eq ? null : s.selectedVolcano })),
  selectVolcano: (v) => set((s) => ({ selectedVolcano: v, selectedEarthquake: v ? null : s.selectedEarthquake })),
  // Changing either filter mid-replay stops and resets playback rather than
  // letting it keep running against a filter it was never computed for —
  // see handleReset in PlaybackControls.tsx for why null (not timeRange[0])
  // is the "stopped" playbackTime value.
  setTimeRange: (range) => set({ timeRange: range, isPlaying: false, playbackTime: null }),
  setMagRange: (range) => set({ magRange: range, isPlaying: false, playbackTime: null }),
  setTranslucentGlobe: (translucent) => set({ translucentGlobe: translucent }),
  setFaultLayer: (key, value) => set((s) => ({ faultLayers: { ...s.faultLayers, [key]: value } })),
  setVolcanoesVisible: (visible) => set({ volcanoesVisible: visible }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setPlaybackTime: (time) => set({ playbackTime: time }),
  setPlaybackSpeed: (daysPerSec) => set({ playbackSpeedDaysPerSec: daysPerSec }),
  setRefreshing: (refreshing) => set({ refreshing }),
  bumpDataVersion: () => set((s) => ({ dataVersion: s.dataVersion + 1 })),
}));
