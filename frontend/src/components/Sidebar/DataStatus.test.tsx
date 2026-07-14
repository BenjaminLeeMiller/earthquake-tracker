// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DataStatus } from "./DataStatus";
import { useAppStore } from "../../store/useAppStore";
import * as api from "../../api/earthquakes";
import type { EarthquakeOut } from "../../api/earthquakes";

const INITIAL_STATE = useAppStore.getState();

beforeEach(() => {
  useAppStore.setState(INITIAL_STATE, true);
  vi.restoreAllMocks();
});

const QUAKE: EarthquakeOut = {
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
};

describe("DataStatus", () => {
  it("renders nothing when idle with data loaded", () => {
    useAppStore.setState({ earthquakes: [QUAKE] });
    const { container } = render(<DataStatus />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows a loading note during the initial load", () => {
    useAppStore.setState({ quakesLoading: true, earthquakes: [] });
    render(<DataStatus />);
    expect(screen.getByText("Loading earthquakes…")).toBeInTheDocument();
  });

  it("stays quiet during a reload when data is already showing", () => {
    // Reloads (dataVersion bumps) keep the previous dataset on screen —
    // flashing "Loading…" over live data would just be noise.
    useAppStore.setState({ quakesLoading: true, earthquakes: [QUAKE] });
    const { container } = render(<DataStatus />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the error with a Retry button that re-triggers the load", () => {
    useAppStore.setState({ quakesError: "boom" });
    vi.spyOn(api, "fetchAllEarthquakes").mockResolvedValue({ total: 0, items: [] });
    render(<DataStatus />);

    expect(screen.getByText(/Failed to load earthquakes: boom/)).toBeInTheDocument();

    fireEvent.click(screen.getByText("Retry"));
    expect(api.fetchAllEarthquakes).toHaveBeenCalledTimes(1);
  });
});
