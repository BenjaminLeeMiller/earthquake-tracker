// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { EarthquakeDataLoader } from "./EarthquakeDataLoader";
import { useAppStore } from "../store/useAppStore";
import * as api from "../api/earthquakes";

const INITIAL_STATE = useAppStore.getState();

beforeEach(() => {
  useAppStore.setState(INITIAL_STATE, true);
  vi.restoreAllMocks();
});

describe("EarthquakeDataLoader", () => {
  it("loads the dataset into the store on mount", async () => {
    vi.spyOn(api, "fetchAllEarthquakes").mockResolvedValue({ total: 0, items: [] });
    render(<EarthquakeDataLoader />);

    await waitFor(() => expect(api.fetchAllEarthquakes).toHaveBeenCalledTimes(1));
  });

  it("reloads when dataVersion bumps (e.g. after a manual USGS refresh)", async () => {
    vi.spyOn(api, "fetchAllEarthquakes").mockResolvedValue({ total: 0, items: [] });
    render(<EarthquakeDataLoader />);
    await waitFor(() => expect(api.fetchAllEarthquakes).toHaveBeenCalledTimes(1));

    useAppStore.getState().bumpDataVersion();
    await waitFor(() => expect(api.fetchAllEarthquakes).toHaveBeenCalledTimes(2));
  });
});
