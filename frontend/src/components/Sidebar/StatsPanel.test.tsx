// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { StatsPanel } from "./StatsPanel";
import { useAppStore } from "../../store/useAppStore";
import * as api from "../../api/earthquakes";
import type { GlobeStats } from "../../api/earthquakes";

const INITIAL_STATE = useAppStore.getState();

beforeEach(() => {
  useAppStore.setState(INITIAL_STATE, true);
  vi.restoreAllMocks();
});

const STATS: GlobeStats = {
  total_earthquakes: 11047,
  earliest: "2024-01-01T00:00:00Z",
  latest: "2024-02-01T00:00:00Z",
  active_layers: [0, 1, 2],
  last_fetched: "2024-02-01T12:00:00Z",
};

describe("StatsPanel", () => {
  it("shows a loading state before stats resolve", () => {
    vi.spyOn(api, "fetchGlobeStats").mockReturnValue(new Promise(() => {})); // never resolves
    render(<StatsPanel />);
    expect(screen.getByText("Loading stats…")).toBeInTheDocument();
  });

  it("shows stats once fetchGlobeStats resolves", async () => {
    vi.spyOn(api, "fetchGlobeStats").mockResolvedValue(STATS);
    render(<StatsPanel />);

    expect(await screen.findByText("11,047")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument(); // active_layers.length
  });

  it("clicking refresh calls triggerRefresh, then re-polls stats until last_fetched changes", async () => {
    vi.spyOn(api, "fetchGlobeStats").mockResolvedValueOnce(STATS);
    render(<StatsPanel />);
    await screen.findByText("11,047");

    const updatedStats: GlobeStats = { ...STATS, last_fetched: "2024-02-01T13:00:00Z" };
    const triggerRefresh = vi
      .spyOn(api, "triggerRefresh")
      .mockResolvedValue({ status: "refresh started" });
    vi.spyOn(api, "fetchGlobeStats").mockResolvedValue(updatedStats);

    fireEvent.click(screen.getByText("⟳ Refresh from USGS"));

    expect(await screen.findByText("Refreshing from USGS…")).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText("⟳ Refresh from USGS")).toBeInTheDocument());

    expect(triggerRefresh).toHaveBeenCalledOnce();
    expect(useAppStore.getState().dataVersion).toBe(1);
    expect(useAppStore.getState().stats?.last_fetched).toBe("2024-02-01T13:00:00Z");
  });

  it("shows an error message if triggerRefresh fails", async () => {
    vi.spyOn(api, "fetchGlobeStats").mockResolvedValue(STATS);
    render(<StatsPanel />);
    await screen.findByText("11,047");

    vi.spyOn(api, "triggerRefresh").mockRejectedValue(new Error("network down"));

    fireEvent.click(screen.getByText("⟳ Refresh from USGS"));

    expect(await screen.findByText("network down")).toBeInTheDocument();
    expect(useAppStore.getState().refreshing).toBe(false);
  });
});
