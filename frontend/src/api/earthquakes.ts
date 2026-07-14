import { apiFetch } from "./client";

export interface EarthquakeOut {
  id: string;
  longitude: number | null;
  latitude: number | null;
  depth_km: number | null;
  magnitude: number | null;
  magnitude_type: string | null;
  occurred_at: string | null;
  place: string | null;
  depth_layer: number | null;
  lat_band: number | null;
  lon_index: number | null;
}

export interface EarthquakeListResponse {
  total: number;
  items: EarthquakeOut[];
}

export interface GlobeStats {
  total_earthquakes: number;
  earliest: string | null;
  latest: string | null;
  last_fetched: string | null;
}

export function fetchEarthquakes(
  minMag = 0,
  limit = 100,
  offset = 0
): Promise<EarthquakeListResponse> {
  return apiFetch(`/earthquakes?min_mag=${minMag}&limit=${limit}&offset=${offset}`);
}

export function triggerRefresh(): Promise<{ status: string }> {
  return apiFetch("/earthquakes/refresh", { method: "POST" });
}

export function fetchAllEarthquakes(): Promise<EarthquakeListResponse> {
  return apiFetch("/globe/earthquakes");
}

export function fetchGlobeStats(): Promise<GlobeStats> {
  return apiFetch("/globe/stats");
}
