/**
 * Mirror of backend/app/services/grid.py — must stay in sync.
 */
const EARTH_RADIUS_MILES = 3959.0;
export const EARTH_RADIUS_KM = EARTH_RADIUS_MILES * 1.60934; // ≈ 6371 km

/** Convert lat/lon (degrees) to 3D XYZ on a sphere of given radius (Y-up). */
export function latLonToXYZ(lat: number, lon: number, radius = 1.0): [number, number, number] {
  const φ = (lat * Math.PI) / 180;
  const λ = (lon * Math.PI) / 180;
  return [
    radius * Math.cos(φ) * Math.sin(λ),
    radius * Math.sin(φ),
    radius * Math.cos(φ) * Math.cos(λ),
  ];
}

/** True-depth radius inset: shallow quakes sit near the surface, deep ones sink toward center. */
export function depthToRadius(depthKm: number | null, surfaceRadius = 1): number {
  const km = depthKm ?? 0;
  return Math.max(0.05, surfaceRadius - km / EARTH_RADIUS_KM);
}

export function latLonDepthToXYZ(
  lat: number,
  lon: number,
  depthKm: number | null,
  surfaceRadius = 1
): [number, number, number] {
  return latLonToXYZ(lat, lon, depthToRadius(depthKm, surfaceRadius));
}
