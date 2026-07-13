import { describe, it, expect } from "vitest";
import { computeHistogramBuckets } from "./replayHistogram";
import type { EarthquakeOut } from "../api/earthquakes";

const HOUR_MS = 60 * 60 * 1000;

function makeQuake(overrides: Partial<EarthquakeOut> = {}): EarthquakeOut {
  return {
    id: "q1",
    longitude: 0,
    latitude: 0,
    depth_km: 0,
    magnitude: 5,
    magnitude_type: "mb",
    occurred_at: null,
    place: null,
    depth_layer: null,
    lat_band: null,
    lon_index: null,
    ...overrides,
  };
}

describe("computeHistogramBuckets", () => {
  it("returns bucketCount empty buckets for an empty quake list", () => {
    const buckets = computeHistogramBuckets([], [0, 10 * HOUR_MS], [0, 10], 10);
    expect(buckets).toHaveLength(10);
    expect(buckets.every((b) => b.count === 0 && b.maxMagnitude === null)).toBe(true);
  });

  it("places a quake in the correct bucket by occurred_at", () => {
    const start = 0;
    const end = 10 * HOUR_MS;
    const quake = makeQuake({ occurred_at: new Date(3.5 * HOUR_MS).toISOString(), magnitude: 4 });
    const buckets = computeHistogramBuckets([quake], [start, end], [0, 10], 10);
    // 10 buckets over 10 hours -> 1 hour each; 3.5h falls in bucket index 3.
    expect(buckets[3].count).toBe(1);
    expect(buckets[3].maxMagnitude).toBe(4);
    expect(buckets.filter((_, i) => i !== 3).every((b) => b.count === 0)).toBe(true);
  });

  it("tracks the max magnitude per bucket, not just the count", () => {
    const start = 0;
    const end = HOUR_MS;
    const quakes = [
      makeQuake({ occurred_at: new Date(100).toISOString(), magnitude: 2 }),
      makeQuake({ occurred_at: new Date(200).toISOString(), magnitude: 6.5 }),
      makeQuake({ occurred_at: new Date(300).toISOString(), magnitude: 4 }),
    ];
    const buckets = computeHistogramBuckets(quakes, [start, end], [0, 10], 1);
    expect(buckets[0].count).toBe(3);
    expect(buckets[0].maxMagnitude).toBe(6.5);
  });

  it("excludes quakes outside the magnitude range", () => {
    const quakes = [
      makeQuake({ occurred_at: new Date(0).toISOString(), magnitude: 1 }),
      makeQuake({ occurred_at: new Date(0).toISOString(), magnitude: 9 }),
    ];
    const buckets = computeHistogramBuckets(quakes, [0, HOUR_MS], [2, 5], 1);
    expect(buckets[0].count).toBe(0);
  });

  it("excludes quakes outside the time range", () => {
    const quakes = [
      makeQuake({ occurred_at: new Date(-1000).toISOString() }), // before start
      makeQuake({ occurred_at: new Date(2 * HOUR_MS).toISOString() }), // after end
    ];
    const buckets = computeHistogramBuckets(quakes, [0, HOUR_MS], [0, 10], 1);
    expect(buckets[0].count).toBe(0);
  });

  it("excludes quakes with no occurred_at", () => {
    const quakes = [makeQuake({ occurred_at: null })];
    const buckets = computeHistogramBuckets(quakes, [0, HOUR_MS], [0, 10], 1);
    expect(buckets[0].count).toBe(0);
  });

  it("treats a missing magnitude as 0 for the range filter", () => {
    const quake = makeQuake({ occurred_at: new Date(0).toISOString(), magnitude: null });
    const withinRange = computeHistogramBuckets([quake], [0, HOUR_MS], [0, 5], 1);
    expect(withinRange[0].count).toBe(1);
    expect(withinRange[0].maxMagnitude).toBe(0);

    const excludedByFloor = computeHistogramBuckets([quake], [0, HOUR_MS], [1, 5], 1);
    expect(excludedByFloor[0].count).toBe(0);
  });

  it("clamps a quake exactly at the end boundary into the last bucket", () => {
    const start = 0;
    const end = 10 * HOUR_MS;
    const quake = makeQuake({ occurred_at: new Date(end).toISOString() });
    const buckets = computeHistogramBuckets([quake], [start, end], [0, 10], 10);
    expect(buckets[9].count).toBe(1);
  });

  it("returns empty buckets gracefully when end <= start", () => {
    const buckets = computeHistogramBuckets([makeQuake()], [1000, 1000], [0, 10], 10);
    expect(buckets).toHaveLength(10);
    expect(buckets.every((b) => b.count === 0)).toBe(true);
  });

  it("returns an empty array when bucketCount is 0", () => {
    const buckets = computeHistogramBuckets([], [0, HOUR_MS], [0, 10], 0);
    expect(buckets).toEqual([]);
  });
});
