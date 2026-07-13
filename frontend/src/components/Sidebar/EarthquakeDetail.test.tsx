// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EarthquakeDetail } from "./EarthquakeDetail";
import { useAppStore } from "../../store/useAppStore";
import type { EarthquakeOut } from "../../api/earthquakes";

const INITIAL_STATE = useAppStore.getState();

beforeEach(() => {
  useAppStore.setState(INITIAL_STATE, true);
});

const QUAKE: EarthquakeOut = {
  id: "us1234",
  longitude: 139.7,
  latitude: 35.6,
  depth_km: 10,
  magnitude: 5.4,
  magnitude_type: "mb",
  occurred_at: "2024-01-01T00:00:00Z",
  place: "Near Testville",
  depth_layer: 0,
  lat_band: 0,
  lon_index: 0,
};

describe("EarthquakeDetail", () => {
  it("renders nothing when no earthquake is selected", () => {
    const { container } = render(<EarthquakeDetail />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the selected earthquake's details", () => {
    useAppStore.getState().selectEarthquake(QUAKE);
    render(<EarthquakeDetail />);

    expect(screen.getByText("Selected Earthquake")).toBeInTheDocument();
    expect(screen.getByText("M5.4")).toBeInTheDocument();
    expect(screen.getByText("Near Testville")).toBeInTheDocument();
  });

  it("clicking the close button clears the selection", () => {
    useAppStore.getState().selectEarthquake(QUAKE);
    render(<EarthquakeDetail />);

    fireEvent.click(screen.getByText("✕"));

    expect(useAppStore.getState().selectedEarthquake).toBeNull();
  });
});
