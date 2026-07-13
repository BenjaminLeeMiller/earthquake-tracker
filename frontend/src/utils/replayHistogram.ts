import type { EarthquakeOut } from "../api/earthquakes";

export interface HistogramBucket {
  count: number;
  maxMagnitude: number | null;
}

/**
 * Buckets quakes into `bucketCount` equal-duration time slices spanning
 * `timeRange`, matching the same time+magnitude filter EarthquakeLayer.tsx
 * applies for display, so the histogram reflects exactly what's visible on
 * the globe. Each bucket's time span is timeRange's duration / bucketCount
 * — a fixed bucket count (chosen by the caller based on available width)
 * determines each bucket's real-world duration, not the other way around.
 */
export function computeHistogramBuckets(
  quakes: EarthquakeOut[],
  timeRange: readonly [number, number],
  magRange: readonly [number, number],
  bucketCount: number
): HistogramBucket[] {
  const [start, end] = timeRange;
  const [minMag, maxMag] = magRange;
  const buckets: HistogramBucket[] = Array.from({ length: Math.max(0, bucketCount) }, () => ({
    count: 0,
    maxMagnitude: null,
  }));
  if (buckets.length === 0 || end <= start) return buckets;

  const bucketMs = (end - start) / bucketCount;
  for (const eq of quakes) {
    if (!eq.occurred_at) continue;
    const t = new Date(eq.occurred_at).getTime();
    if (t < start || t > end) continue;

    const mag = eq.magnitude ?? 0;
    if (mag < minMag || mag > maxMag) continue;

    // Clamp so a quake exactly at `end` lands in the last bucket instead
    // of overflowing past the array.
    const idx = Math.min(bucketCount - 1, Math.max(0, Math.floor((t - start) / bucketMs)));

    const bucket = buckets[idx];
    bucket.count += 1;
    if (bucket.maxMagnitude === null || mag > bucket.maxMagnitude) {
      bucket.maxMagnitude = mag;
    }
  }
  return buckets;
}
