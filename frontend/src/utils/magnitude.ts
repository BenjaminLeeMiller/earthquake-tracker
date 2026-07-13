export const MIN_MAG = 0;
export const MAX_MAG = 10;

function clampedMag(mag: number | null): number {
  return Math.max(MIN_MAG, Math.min(MAX_MAG, mag ?? MIN_MAG));
}

// Linear (not curved) so every whole-number magnitude step gets a visually
// distinguishable color, including at the low end — a curved mapping here
// previously compressed most small quakes into nearly the same color.
function normalizedMag(mag: number | null): number {
  return (clampedMag(mag) - MIN_MAG) / (MAX_MAG - MIN_MAG);
}

// Multi-hue heat-map stops: pale yellow (small quakes) -> amber -> orange-red
// -> red -> dark maroon (large quakes). A single-hue ramp (e.g. beige->dark
// red) only varies in shade, which the eye struggles to tell apart in small
// steps; shifting hue between stops as magnitude increases makes adjacent
// whole-number magnitudes visually distinct at a glance, not just "a bit
// darker." Interpolated piecewise-linearly between consecutive stops.
const COLOR_STOPS: [number, number, number][] = [
  [255, 241, 150], // t=0.00 — pale yellow
  [255, 176, 59], // t=0.25 — amber
  [237, 106, 43], // t=0.50 — orange-red
  [198, 40, 40], // t=0.75 — red
  [105, 0, 0], // t=1.00 — dark maroon
];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function colorAt(t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  const segments = COLOR_STOPS.length - 1;
  const scaled = clamped * segments;
  const i = Math.min(segments - 1, Math.floor(scaled));
  const localT = scaled - i;
  const [r1, g1, b1] = COLOR_STOPS[i];
  const [r2, g2, b2] = COLOR_STOPS[i + 1];
  const r = Math.round(lerp(r1, r2, localT));
  const g = Math.round(lerp(g1, g2, localT));
  const b = Math.round(lerp(b1, b2, localT));
  return `rgb(${r}, ${g}, ${b})`;
}

// The color gradient's own domain is narrower than MIN_MAG..MAX_MAG: real
// earthquake data is heavily concentrated in a mid-single-digit band (the
// app's own default magnitude floor is 2.5, and M7+ events are rare), so
// stretching the gradient across the full 0-10 range left the vast
// majority of on-screen quakes crammed into a sliver of it, still looking
// nearly the same color. Scoping the gradient to this practical band means
// differentiation is spent where the data actually is; magnitudes outside
// it just clamp to the nearest endpoint color.
const COLOR_MIN_MAG = 2.5;
const COLOR_MAX_MAG = 7;

function normalizedMagForColor(mag: number | null): number {
  const m = Math.max(COLOR_MIN_MAG, Math.min(COLOR_MAX_MAG, mag ?? COLOR_MIN_MAG));
  return (m - COLOR_MIN_MAG) / (COLOR_MAX_MAG - COLOR_MIN_MAG);
}

/** Canonical magnitude→color mapping, shared by sidebar cards and globe markers. */
export function magColor(mag: number | null): string {
  return colorAt(normalizedMagForColor(mag));
}

/** Magnitude→sphere radius (world units; base sphereGeometry radius is 1). */
const MIN_R = 0.001;
const MAX_R = 0.05;
// Steeper than a linear falloff so small quakes shrink further relative to
// the max, independent of the (now-linear) color gradient.
const RADIUS_CURVE = 2.6;

export function magRadius(mag: number | null): number {
  const t = Math.pow(normalizedMag(mag), RADIUS_CURVE);
  return MIN_R + t * (MAX_R - MIN_R);
}

/**
 * Discrete magnitude buckets for the globe markers — one bucket per
 * whole-number magnitude (0 through MAX_MAG), so even low-magnitude quakes
 * get visually distinguishable colors instead of clustering together.
 * Per-instance vertex colors on InstancedMesh render solid black in this
 * app's three.js/R3F setup (reproducible regardless of color value, tone
 * mapping, or color space — confirmed via isolated testing), so each
 * bucket gets its own InstancedMesh with a uniform material color instead.
 * Marker size still varies continuously via magRadius.
 */
export const MAG_BUCKET_COUNT = MAX_MAG - MIN_MAG + 1; // 11: one per whole-number magnitude 0–10

export function magBucketIndex(mag: number | null): number {
  return Math.min(MAG_BUCKET_COUNT - 1, Math.floor(clampedMag(mag)));
}

// Each bucket's color reflects where its whole-number magnitude falls
// within the practical COLOR_MIN_MAG..COLOR_MAX_MAG band (same scoping as
// magColor), not a straight line across all 11 buckets — magnitudes below
// 2.5 or above 7 clamp to the nearest endpoint since they're rare in
// practice (and the app's own default filter already excludes sub-2.5).
export const MAG_BUCKET_COLORS: string[] = Array.from({ length: MAG_BUCKET_COUNT }, (_, i) =>
  colorAt(normalizedMagForColor(i))
);

// Replay fade-out duration per magnitude bucket: weaker quakes fade within
// hours, the strongest linger for a few days — bigger quakes stay visually
// significant longer.
const MIN_FADE_HOURS = 12;
const MAX_FADE_HOURS = 10 * 24;

export const MAG_BUCKET_FADE_DURATIONS_MS: number[] = Array.from(
  { length: MAG_BUCKET_COUNT },
  (_, i) => {
    const t = (i + 0.5) / MAG_BUCKET_COUNT;
    return (MIN_FADE_HOURS + t * (MAX_FADE_HOURS - MIN_FADE_HOURS)) * 60 * 60 * 1000;
  }
);
