// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ReplayHistograms } from "./ReplayHistograms";
import { useAppStore } from "../../store/useAppStore";
import * as api from "../../api/earthquakes";
import type { EarthquakeOut, EarthquakeListResponse } from "../../api/earthquakes";

const INITIAL_STATE = useAppStore.getState();

beforeEach(() => {
  useAppStore.setState(INITIAL_STATE, true);
  vi.restoreAllMocks();
});

const HOUR_MS = 60 * 60 * 1000;

function makeQuake(overrides: Partial<EarthquakeOut> = {}): EarthquakeOut {
  return {
    id: "q1",
    longitude: 0,
    latitude: 0,
    depth_km: 0,
    magnitude: 5,
    magnitude_type: "mb",
    occurred_at: null,
    place: null,
    depth_layer: null,
    lat_band: null,
    lon_index: null,
    ...overrides,
  };
}

function mockQuakes(items: EarthquakeOut[]) {
  const response: EarthquakeListResponse = { total: items.length, items };
  return vi.spyOn(api, "fetchAllEarthquakes").mockResolvedValue(response);
}

describe("ReplayHistograms", () => {
  it("renders nothing when there's no time range yet", () => {
    mockQuakes([]);
    const { container } = render(<ReplayHistograms />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders both histogram labels once a time range exists", async () => {
    mockQuakes([]);
    useAppStore.setState({ timeRange: [0, 10 * HOUR_MS] });
    render(<ReplayHistograms />);

    expect(await screen.findByText("Quakes / slice")).toBeInTheDocument();
    expect(screen.getByText("Max magnitude / slice")).toBeInTheDocument();
  });

  it("does not show a progress line when no replay session is active", async () => {
    mockQuakes([makeQuake({ occurred_at: new Date(HOUR_MS).toISOString() })]);
    useAppStore.setState({ timeRange: [0, 10 * HOUR_MS] });
    render(<ReplayHistograms />);
    await screen.findByText("Quakes / slice");

    expect(screen.queryAllByTestId("replay-progress-line")).toHaveLength(0);
  });

  it("shows a progress line on both histograms, positioned at the playback fraction", async () => {
    mockQuakes([]);
    useAppStore.setState({ timeRange: [0, 10 * HOUR_MS], playbackTime: 5 * HOUR_MS });
    render(<ReplayHistograms />);
    await screen.findByText("Quakes / slice");

    const lines = await screen.findAllByTestId("replay-progress-line");
    expect(lines).toHaveLength(2); // one per histogram
    for (const line of lines) {
      expect(line.style.left).toBe("50%");
    }
  });

  it("keeps showing the progress line when paused (playbackTime set, isPlaying false)", async () => {
    mockQuakes([]);
    useAppStore.setState({
      timeRange: [0, 10 * HOUR_MS],
      playbackTime: 2 * HOUR_MS,
      isPlaying: false,
    });
    render(<ReplayHistograms />);
    await screen.findByText("Quakes / slice");

    const lines = await screen.findAllByTestId("replay-progress-line");
    expect(lines[0].style.left).toBe("20%");
  });

  it("refetches quakes when dataVersion bumps (e.g. after a manual refresh)", async () => {
    mockQuakes([]);
    useAppStore.setState({ timeRange: [0, 10 * HOUR_MS] });
    render(<ReplayHistograms />);
    await waitFor(() => expect(api.fetchAllEarthquakes).toHaveBeenCalledTimes(1));

    useAppStore.getState().bumpDataVersion();
    await waitFor(() => expect(api.fetchAllEarthquakes).toHaveBeenCalledTimes(2));
  });
});
