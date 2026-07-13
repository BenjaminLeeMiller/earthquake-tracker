// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TimeRangeSlider } from "./TimeRangeSlider";
import { useAppStore } from "../../store/useAppStore";

const INITIAL_STATE = useAppStore.getState();

beforeEach(() => {
  useAppStore.setState(INITIAL_STATE, true);
});

const EARLIEST = new Date("2024-01-01T00:00:00Z").toISOString();
const LATEST = new Date("2024-02-01T00:00:00Z").toISOString();

function seedStats() {
  useAppStore.getState().setStats({
    total_earthquakes: 10,
    earliest: EARLIEST,
    latest: LATEST,
    active_layers: [0],
    last_fetched: null,
  });
}

describe("TimeRangeSlider", () => {
  it("renders nothing when stats haven't loaded", () => {
    const { container } = render(<TimeRangeSlider />);
    expect(container).toBeEmptyDOMElement();
  });

  it("self-seeds a timeRange from stats and shows it collapsed by default", () => {
    seedStats();
    render(<TimeRangeSlider />);

    expect(screen.getByText("Time Range")).toBeInTheDocument();
    expect(useAppStore.getState().timeRange).not.toBeNull();
    // Collapsed by default — no range inputs or Reset button yet.
    expect(screen.queryAllByRole("slider")).toHaveLength(0);
    expect(screen.queryByText("Reset")).not.toBeInTheDocument();
  });

  it("expanding reveals From/To sliders and a Reset button", () => {
    seedStats();
    render(<TimeRangeSlider />);

    fireEvent.click(screen.getByRole("button", { name: /Time Range/ }));

    expect(screen.getByText("From")).toBeInTheDocument();
    expect(screen.getByText("To")).toBeInTheDocument();
    expect(screen.getByText("Reset")).toBeInTheDocument();
  });

  it("Reset restores the full stats bounds and clears playback", () => {
    seedStats();
    useAppStore.setState({ isPlaying: true, playbackTime: 12345 });
    render(<TimeRangeSlider />);

    fireEvent.click(screen.getByRole("button", { name: /Time Range/ }));
    fireEvent.click(screen.getByText("Reset"));

    const { timeRange, isPlaying, playbackTime } = useAppStore.getState();
    expect(timeRange).toEqual([new Date(EARLIEST).getTime(), new Date(LATEST).getTime()]);
    expect(isPlaying).toBe(false);
    expect(playbackTime).toBeNull();
  });
});
