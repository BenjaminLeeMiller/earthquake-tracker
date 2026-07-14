// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReplayHistograms } from "./ReplayHistograms";
import { useAppStore } from "../../store/useAppStore";
import type { EarthquakeOut } from "../../api/earthquakes";

const INITIAL_STATE = useAppStore.getState();

beforeEach(() => {
  useAppStore.setState(INITIAL_STATE, true);
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
    url: null,
    depth_layer: null,
    lat_band: null,
    lon_index: null,
    ...overrides,
  };
}

describe("ReplayHistograms", () => {
  it("renders nothing when there's no time range yet", () => {
    const { container } = render(<ReplayHistograms />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders both histogram labels once a time range exists", () => {
    useAppStore.setState({ timeRange: [0, 10 * HOUR_MS] });
    render(<ReplayHistograms />);

    expect(screen.getByText("Quakes / slice")).toBeInTheDocument();
    expect(screen.getByText("Max magnitude / slice")).toBeInTheDocument();
  });

  it("does not show a progress line when no replay session is active", () => {
    useAppStore.setState({
      timeRange: [0, 10 * HOUR_MS],
      earthquakes: [makeQuake({ occurred_at: new Date(HOUR_MS).toISOString() })],
    });
    render(<ReplayHistograms />);

    expect(screen.queryAllByTestId("replay-progress-line")).toHaveLength(0);
  });

  it("shows a progress line on both histograms, positioned at the playback fraction", () => {
    useAppStore.setState({ timeRange: [0, 10 * HOUR_MS], playbackTime: 5 * HOUR_MS });
    render(<ReplayHistograms />);

    const lines = screen.getAllByTestId("replay-progress-line");
    expect(lines).toHaveLength(2); // one per histogram
    for (const line of lines) {
      expect(line.style.left).toBe("50%");
    }
  });

  it("keeps showing the progress line when paused (playbackTime set, isPlaying false)", () => {
    useAppStore.setState({
      timeRange: [0, 10 * HOUR_MS],
      playbackTime: 2 * HOUR_MS,
      isPlaying: false,
    });
    render(<ReplayHistograms />);

    const lines = screen.getAllByTestId("replay-progress-line");
    expect(lines[0].style.left).toBe("20%");
  });

  it("reads quakes from the shared store dataset", () => {
    // A quake inside the window makes at least one bar taller than the
    // baseline — assert the store data actually feeds the chart.
    useAppStore.setState({
      timeRange: [0, 10 * HOUR_MS],
      earthquakes: [makeQuake({ occurred_at: new Date(HOUR_MS).toISOString(), magnitude: 5 })],
    });
    render(<ReplayHistograms />);

    const chart = screen.getByText("Quakes / slice").parentElement!;
    const bars = chart.querySelectorAll("div > div > div");
    const heights = [...bars].map((b) => (b as HTMLElement).style.height);
    expect(heights).toContain("100%");
  });
});
