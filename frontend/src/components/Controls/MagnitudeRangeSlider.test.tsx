// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MagnitudeRangeSlider } from "./MagnitudeRangeSlider";
import { useAppStore, DEFAULT_MIN_MAGNITUDE } from "../../store/useAppStore";
import { MAX_MAG } from "../../utils/magnitude";

const INITIAL_STATE = useAppStore.getState();

beforeEach(() => {
  useAppStore.setState(INITIAL_STATE, true);
});

describe("MagnitudeRangeSlider", () => {
  it("shows the current range collapsed by default", () => {
    render(<MagnitudeRangeSlider />);

    const [min, max] = useAppStore.getState().magRange;
    expect(screen.getByText("Magnitude Range")).toBeInTheDocument();
    expect(screen.getByText(`${min.toFixed(1)} – ${max.toFixed(1)}`)).toBeInTheDocument();
    expect(screen.queryAllByRole("slider")).toHaveLength(0);
  });

  it("expanding reveals Min/Max sliders and a Reset button", () => {
    render(<MagnitudeRangeSlider />);
    fireEvent.click(screen.getByRole("button", { name: /Magnitude Range/ }));

    expect(screen.getByText("Min")).toBeInTheDocument();
    expect(screen.getByText("Max")).toBeInTheDocument();
    expect(screen.getByText("Reset")).toBeInTheDocument();
  });

  it("Reset restores the default DEFAULT_MIN_MAGNITUDE–MAX_MAG range (not the slider's full MIN_MAG floor) and clears playback", () => {
    // Narrow away from the default first, so Reset has something to undo.
    useAppStore.setState({ magRange: [6, 8], isPlaying: true, playbackTime: 999 });
    render(<MagnitudeRangeSlider />);

    fireEvent.click(screen.getByRole("button", { name: /Magnitude Range/ }));
    fireEvent.click(screen.getByText("Reset"));

    const { magRange, isPlaying, playbackTime } = useAppStore.getState();
    expect(magRange).toEqual([DEFAULT_MIN_MAGNITUDE, MAX_MAG]);
    expect(isPlaying).toBe(false);
    expect(playbackTime).toBeNull();
  });

  it("dragging the Min slider updates magRange and resets playback", () => {
    useAppStore.setState({ isPlaying: true, playbackTime: 999 });
    render(<MagnitudeRangeSlider />);
    fireEvent.click(screen.getByRole("button", { name: /Magnitude Range/ }));

    const sliders = screen.getAllByRole("slider");
    fireEvent.change(sliders[0], { target: { value: "4.0" } });

    const { magRange, isPlaying } = useAppStore.getState();
    expect(magRange[0]).toBe(4);
    expect(isPlaying).toBe(false);
  });
});
