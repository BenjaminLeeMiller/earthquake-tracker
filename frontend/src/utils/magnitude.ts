const MIN_MAG = 0;
const MAX_MAG = 8;
const CURVE = 1.6;

function normalizedMag(mag: number | null): number {
  const m = Math.max(MIN_MAG, Math.min(MAX_MAG, mag ?? MIN_MAG));
  return Math.pow((m - MIN_MAG) / (MAX_MAG - MIN_MAG), CURVE);
}

// Heat-map endpoints: light beige (small quakes) -> burnt orange (large quakes).
const COLOR_LOW: [number, number, number] = [245, 230, 200];
const COLOR_HIGH: [number, number, number] = [191, 78, 28];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Canonical magnitude→color mapping, shared by sidebar cards and globe markers. */
export function magColor(mag: number | null): string {
  const t = normalizedMag(mag);
  const r = Math.round(lerp(COLOR_LOW[0], COLOR_HIGH[0], t));
  const g = Math.round(lerp(COLOR_LOW[1], COLOR_HIGH[1], t));
  const b = Math.round(lerp(COLOR_LOW[2], COLOR_HIGH[2], t));
  return `rgb(${r}, ${g}, ${b})`;
}

/** Magnitude→sphere radius (world units; base sphereGeometry radius is 1). */
const MIN_R = 0.004;
const MAX_R = 0.05;

export function magRadius(mag: number | null): number {
  return MIN_R + normalizedMag(mag) * (MAX_R - MIN_R);
}

/**
 * Discrete magnitude buckets for the globe markers. Per-instance vertex
 * colors on InstancedMesh render solid black in this app's three.js/R3F
 * setup (reproducible regardless of color value, tone mapping, or color
 * space — confirmed via isolated testing), so each bucket gets its own
 * InstancedMesh with a uniform material color instead. Marker size still
 * varies continuously via magRadius.
 */
export const MAG_BUCKET_COUNT = 14;

export function magBucketIndex(mag: number | null): number {
  const t = normalizedMag(mag);
  return Math.min(MAG_BUCKET_COUNT - 1, Math.floor(t * MAG_BUCKET_COUNT));
}

export const MAG_BUCKET_COLORS: string[] = Array.from({ length: MAG_BUCKET_COUNT }, (_, i) => {
  const t = (i + 0.5) / MAG_BUCKET_COUNT;
  const r = Math.round(lerp(COLOR_LOW[0], COLOR_HIGH[0], t));
  const g = Math.round(lerp(COLOR_LOW[1], COLOR_HIGH[1], t));
  const b = Math.round(lerp(COLOR_LOW[2], COLOR_HIGH[2], t));
  return `rgb(${r}, ${g}, ${b})`;
});
