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

  it("expanding reveals From/To datetime-local inputs alongside the sliders", () => {
    seedStats();
    render(<TimeRangeSlider />);

    fireEvent.click(screen.getByRole("button", { name: /Time Range/ }));

    const datetimeInputs = document.querySelectorAll('input[type="datetime-local"]');
    expect(datetimeInputs).toHaveLength(2);
  });

  it("typing a From datetime updates timeRange[0], clamped to not cross To", () => {
    seedStats();
    // Explicit full-bounds range, independent of the auto-seeded default
    // (which depends on the real current time relative to the fixture's
    // fixed 2024 bounds).
    useAppStore.setState({ timeRange: [new Date(EARLIEST).getTime(), new Date(LATEST).getTime()] });
    render(<TimeRangeSlider />);
    fireEvent.click(screen.getByRole("button", { name: /Time Range/ }));

    const [fromInput, toInput] = document.querySelectorAll('input[type="datetime-local"]');
    const newFrom = new Date("2024-01-15T00:00");
    fireEvent.change(fromInput, { target: { value: "2024-01-15T00:00" } });
    expect(useAppStore.getState().timeRange?.[0]).toBe(newFrom.getTime());

    // Setting From past the current To clamps it to To instead of crossing.
    const currentTo = useAppStore.getState().timeRange?.[1] as number;
    fireEvent.change(fromInput, { target: { value: "2024-02-15T00:00" } });
    expect(useAppStore.getState().timeRange?.[0]).toBe(currentTo);
    expect(toInput).toBeInTheDocument();
  });

  it("typing a To datetime updates timeRange[1], clamped to not cross From", () => {
    seedStats();
    useAppStore.setState({ timeRange: [new Date(EARLIEST).getTime(), new Date(LATEST).getTime()] });
    render(<TimeRangeSlider />);
    fireEvent.click(screen.getByRole("button", { name: /Time Range/ }));

    const [, toInput] = document.querySelectorAll('input[type="datetime-local"]');
    const newTo = new Date("2024-01-20T12:30");
    fireEvent.change(toInput, { target: { value: "2024-01-20T12:30" } });
    expect(useAppStore.getState().timeRange?.[1]).toBe(newTo.getTime());

    // Setting To before the current From clamps it to From instead of crossing.
    const currentFrom = useAppStore.getState().timeRange?.[0] as number;
    fireEvent.change(toInput, { target: { value: "2023-01-01T00:00" } });
    expect(useAppStore.getState().timeRange?.[1]).toBe(currentFrom);
  });

  it("ignores an unparseable or cleared datetime value", () => {
    seedStats();
    render(<TimeRangeSlider />);
    fireEvent.click(screen.getByRole("button", { name: /Time Range/ }));

    const [fromInput] = document.querySelectorAll('input[type="datetime-local"]');
    const before = useAppStore.getState().timeRange;
    fireEvent.change(fromInput, { target: { value: "" } });
    expect(useAppStore.getState().timeRange).toEqual(before);
  });
});
