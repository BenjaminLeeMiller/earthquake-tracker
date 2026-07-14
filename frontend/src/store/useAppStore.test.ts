import { describe, it, expect, beforeEach, vi } from "vitest";
import { useAppStore } from "./useAppStore";
import * as api from "../api/earthquakes";
import type { EarthquakeOut } from "../api/earthquakes";
import type { VolcanoRecord } from "../types/volcano";
import { computeDefaultPlaybackSpeed } from "../utils/playbackSpeed";

const INITIAL_STATE = useAppStore.getState();

beforeEach(() => {
  useAppStore.setState(INITIAL_STATE, true);
  vi.restoreAllMocks();
});

const makeQuake = (id: string): EarthquakeOut => ({
  id,
  longitude: 0,
  latitude: 0,
  depth_km: 0,
  magnitude: 5,
  magnitude_type: "mb",
  occurred_at: null,
  place: null,
  url: null,
  depth_layer: null,
  lat_band: null,
  lon_index: null,
});

const makeVolcano = (id: number): VolcanoRecord => ({
  id,
  name: "Test Volcano",
  country: "Testland",
  type: null,
  elevationM: null,
  lastEruptionYear: null,
  tectonicSetting: null,
  lat: 0,
  lon: 0,
});

describe("initial state", () => {
  it("matches current defaults", () => {
    const state = useAppStore.getState();
    expect(state.translucentGlobe).toBe(false);
    expect(state.volcanoesVisible).toBe(false);
    expect(state.faultLayers).toEqual({ plateBoundaries: true });
    expect(state.selectedEarthquake).toBeNull();
    expect(state.selectedVolcano).toBeNull();
    expect(state.isPlaying).toBe(false);
    expect(state.playbackTime).toBeNull();
    expect(state.dataVersion).toBe(0);
    expect(state.earthquakes).toEqual([]);
    expect(state.quakesLoading).toBe(false);
    expect(state.quakesError).toBeNull();
  });
});

describe("loadEarthquakes", () => {
  it("stores the fetched dataset and clears the loading flag", async () => {
    const items = [makeQuake("q1"), makeQuake("q2")];
    vi.spyOn(api, "fetchAllEarthquakes").mockResolvedValue({ total: 2, items });

    await useAppStore.getState().loadEarthquakes();

    const state = useAppStore.getState();
    expect(state.earthquakes).toEqual(items);
    expect(state.quakesLoading).toBe(false);
    expect(state.quakesError).toBeNull();
  });

  it("sets quakesError (and stops loading) when the fetch fails", async () => {
    vi.spyOn(api, "fetchAllEarthquakes").mockRejectedValue(new Error("backend down"));

    await useAppStore.getState().loadEarthquakes();

    const state = useAppStore.getState();
    expect(state.quakesError).toBe("backend down");
    expect(state.quakesLoading).toBe(false);
  });

  it("a successful retry clears a previous error", async () => {
    vi.spyOn(api, "fetchAllEarthquakes").mockRejectedValueOnce(new Error("backend down"));
    await useAppStore.getState().loadEarthquakes();
    expect(useAppStore.getState().quakesError).toBe("backend down");

    vi.spyOn(api, "fetchAllEarthquakes").mockResolvedValue({
      total: 1,
      items: [makeQuake("q1")],
    });
    await useAppStore.getState().loadEarthquakes();

    expect(useAppStore.getState().quakesError).toBeNull();
    expect(useAppStore.getState().earthquakes).toHaveLength(1);
  });

  it("ignores an out-of-order response from a superseded request", async () => {
    let resolveFirst!: (v: api.EarthquakeListResponse) => void;
    const first = new Promise<api.EarthquakeListResponse>((r) => (resolveFirst = r));
    vi.spyOn(api, "fetchAllEarthquakes")
      .mockReturnValueOnce(first)
      .mockResolvedValueOnce({ total: 1, items: [makeQuake("newer")] });

    const p1 = useAppStore.getState().loadEarthquakes();
    const p2 = useAppStore.getState().loadEarthquakes();
    await p2;
    resolveFirst({ total: 1, items: [makeQuake("stale")] });
    await p1;

    expect(useAppStore.getState().earthquakes.map((q) => q.id)).toEqual(["newer"]);
  });
});

describe("selection mutual exclusivity", () => {
  it("selecting an earthquake clears any selected volcano", () => {
    useAppStore.getState().selectVolcano(makeVolcano(1));
    expect(useAppStore.getState().selectedVolcano).not.toBeNull();

    useAppStore.getState().selectEarthquake(makeQuake("q1"));
    expect(useAppStore.getState().selectedEarthquake?.id).toBe("q1");
    expect(useAppStore.getState().selectedVolcano).toBeNull();
  });

  it("selecting a volcano clears any selected earthquake", () => {
    useAppStore.getState().selectEarthquake(makeQuake("q1"));
    expect(useAppStore.getState().selectedEarthquake).not.toBeNull();

    useAppStore.getState().selectVolcano(makeVolcano(1));
    expect(useAppStore.getState().selectedVolcano?.id).toBe(1);
    expect(useAppStore.getState().selectedEarthquake).toBeNull();
  });

  it("deselecting an earthquake (null) leaves an unrelated volcano selection alone", () => {
    useAppStore.getState().selectVolcano(makeVolcano(1));
    useAppStore.getState().selectEarthquake(null);
    expect(useAppStore.getState().selectedVolcano).not.toBeNull();
  });

  it("deselecting a volcano (null) leaves an unrelated earthquake selection alone", () => {
    useAppStore.getState().selectEarthquake(makeQuake("q1"));
    useAppStore.getState().selectVolcano(null);
    expect(useAppStore.getState().selectedEarthquake).not.toBeNull();
  });
});

describe("filter changes reset replay", () => {
  it("setTimeRange stops playback and clears playbackTime", () => {
    useAppStore.setState({ isPlaying: true, playbackTime: 12345 });

    useAppStore.getState().setTimeRange([0, 100]);

    const state = useAppStore.getState();
    expect(state.timeRange).toEqual([0, 100]);
    expect(state.isPlaying).toBe(false);
    expect(state.playbackTime).toBeNull();
  });

  it("setTimeRange recomputes playbackSpeedDaysPerSec for a ~30-second sweep of the new range", () => {
    const DAY_MS = 24 * 60 * 60 * 1000;
    useAppStore.setState({ playbackSpeedDaysPerSec: 999 }); // arbitrary prior value

    useAppStore.getState().setTimeRange([0, 14 * DAY_MS]);

    expect(useAppStore.getState().playbackSpeedDaysPerSec).toBeCloseTo(
      computeDefaultPlaybackSpeed(0, 14 * DAY_MS),
      10
    );
  });

  it("setMagRange stops playback and clears playbackTime", () => {
    useAppStore.setState({ isPlaying: true, playbackTime: 12345 });

    useAppStore.getState().setMagRange([1, 5]);

    const state = useAppStore.getState();
    expect(state.magRange).toEqual([1, 5]);
    expect(state.isPlaying).toBe(false);
    expect(state.playbackTime).toBeNull();
  });
});

describe("setFaultLayer", () => {
  it("updates the targeted key via a merge, not a wholesale replace", () => {
    // Spreads the existing faultLayers record rather than overwriting it
    // outright — asserting that shape (not just the end value) is what
    // guards against a future regression to `faultLayers: { [key]: value }`,
    // which would silently drop every other fault-line dataset once a
    // second one is added.
    useAppStore.getState().setFaultLayer("plateBoundaries", false);
    expect(useAppStore.getState().faultLayers).toEqual({ plateBoundaries: false });

    useAppStore.getState().setFaultLayer("plateBoundaries", true);
    expect(useAppStore.getState().faultLayers).toEqual({ plateBoundaries: true });
  });
});

describe("bumpDataVersion", () => {
  it("increments from whatever the current value is", () => {
    expect(useAppStore.getState().dataVersion).toBe(0);

    useAppStore.getState().bumpDataVersion();
    expect(useAppStore.getState().dataVersion).toBe(1);

    useAppStore.getState().bumpDataVersion();
    useAppStore.getState().bumpDataVersion();
    expect(useAppStore.getState().dataVersion).toBe(3);
  });
});
