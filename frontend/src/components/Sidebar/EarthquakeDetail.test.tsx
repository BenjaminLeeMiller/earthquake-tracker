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
  url: null,
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

  it("shows a USGS event link when the quake has a url, opening in a new tab", () => {
    const eventUrl = "https://earthquake.usgs.gov/earthquakes/eventpage/us1234";
    useAppStore.getState().selectEarthquake({ ...QUAKE, url: eventUrl });
    render(<EarthquakeDetail />);

    const link = screen.getByRole("link", { name: /View on USGS/ });
    expect(link).toHaveAttribute("href", eventUrl);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("omits the USGS link when the quake has no url", () => {
    useAppStore.getState().selectEarthquake(QUAKE);
    render(<EarthquakeDetail />);

    expect(screen.queryByRole("link", { name: /View on USGS/ })).not.toBeInTheDocument();
  });

  it("sizes to its content instead of its own flex/scroll region", () => {
    // Regression test: flex + overflowY here previously collapsed this
    // panel's min-height to 0 inside the sidebar's flex column, trapping
    // overflow in a nested scroll region the outer sidebar scroll couldn't
    // reach (see panelStyle.ts, which this must keep using instead).
    useAppStore.getState().selectEarthquake(QUAKE);
    const { container } = render(<EarthquakeDetail />);
    const wrapper = container.firstChild as HTMLElement;

    expect(wrapper.style.flex).toBe("");
    expect(wrapper.style.overflowY).toBe("");
  });
});
