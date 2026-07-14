import { useEffect } from "react";
import { useAppStore } from "../store/useAppStore";

/**
 * Owns the quake-dataset fetch lifecycle: loads on mount and reloads
 * whenever dataVersion bumps (StatsPanel does that once a manual USGS
 * refresh completes). Renders nothing — every consumer reads the shared
 * result from the store instead of fetching its own copy.
 */
export function EarthquakeDataLoader() {
  const dataVersion = useAppStore((s) => s.dataVersion);
  const loadEarthquakes = useAppStore((s) => s.loadEarthquakes);

  useEffect(() => {
    loadEarthquakes();
  }, [dataVersion, loadEarthquakes]);

  return null;
}
