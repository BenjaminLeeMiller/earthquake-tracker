// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PlaybackControls } from "./PlaybackControls";
import { useAppStore } from "../../store/useAppStore";
import * as api from "../../api/earthquakes";

const INITIAL_STATE = useAppStore.getState();

beforeEach(() => {
  useAppStore.setState(INITIAL_STATE, true);
  // PlaybackControls renders ReplayHistograms as a child, which fetches
  // the full quake list on mount -- mock it so tests don't hit a real
  // (and here, unreachable) network request.
  vi.spyOn(api, "fetchAllEarthquakes").mockResolvedValue({ total: 0, items: [] });
});

describe("PlaybackControls", () => {
  it("renders nothing when there's no time range yet", () => {
    const { container } = render(<PlaybackControls />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the play glyph and 'Not started' before any playback", () => {
    useAppStore.setState({ timeRange: [0, 1000] });
    render(<PlaybackControls />);

    expect(screen.getByText("▶")).toBeInTheDocument();
    expect(screen.getByText("Not started")).toBeInTheDocument();
  });

  it("clicking play starts playback from the beginning of the range", () => {
    useAppStore.setState({ timeRange: [1000, 2000] });
    render(<PlaybackControls />);

    fireEvent.click(screen.getByText("▶"));

    expect(useAppStore.getState().isPlaying).toBe(true);
    expect(useAppStore.getState().playbackTime).toBe(1000);
    expect(screen.getByText("⏸")).toBeInTheDocument();
  });

  it("clicking pause (while playing) stops without resetting playbackTime", () => {
    useAppStore.setState({ timeRange: [1000, 2000], isPlaying: true, playbackTime: 1500 });
    render(<PlaybackControls />);

    fireEvent.click(screen.getByText("⏸"));

    expect(useAppStore.getState().isPlaying).toBe(false);
    expect(useAppStore.getState().playbackTime).toBe(1500);
  });

  it("clicking reset clears isPlaying and playbackTime entirely", () => {
    useAppStore.setState({ timeRange: [1000, 2000], isPlaying: true, playbackTime: 1500 });
    render(<PlaybackControls />);

    fireEvent.click(screen.getByTitle("Reset to start"));

    expect(useAppStore.getState().isPlaying).toBe(false);
    expect(useAppStore.getState().playbackTime).toBeNull();
  });

  it("re-playing after reaching the end restarts from the beginning", () => {
    useAppStore.setState({ timeRange: [1000, 2000], isPlaying: false, playbackTime: 2000 });
    render(<PlaybackControls />);

    fireEvent.click(screen.getByText("▶"));

    expect(useAppStore.getState().playbackTime).toBe(1000);
  });

  describe("speed slider", () => {
    it("defaults to 1.0 days/sec", () => {
      useAppStore.setState({ timeRange: [0, 1000] });
      render(<PlaybackControls />);
      expect(screen.getByText("1.0 days/sec")).toBeInTheDocument();
    });

    it("dragging to the minimum shows the adaptive min/sec label", () => {
      useAppStore.setState({ timeRange: [0, 1000] });
      render(<PlaybackControls />);

      fireEvent.change(screen.getByRole("slider"), { target: { value: "0" } });

      expect(screen.getByText("1.0 min/sec")).toBeInTheDocument();
    });

    it("dragging to the maximum shows 14.0 days/sec", () => {
      useAppStore.setState({ timeRange: [0, 1000] });
      render(<PlaybackControls />);

      fireEvent.change(screen.getByRole("slider"), { target: { value: "1000" } });

      expect(screen.getByText("14.0 days/sec")).toBeInTheDocument();
    });
  });
});
