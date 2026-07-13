import { describe, it, expect } from "vitest";
import {
  MIN_MAG,
  MAX_MAG,
  MAG_BUCKET_COUNT,
  MAG_BUCKET_COLORS,
  MAG_BUCKET_FADE_DURATIONS_MS,
  magColor,
  magRadius,
  magBucketIndex,
} from "./magnitude";

describe("magColor", () => {
  it("null behaves like MIN_MAG", () => {
    expect(magColor(null)).toBe(magColor(MIN_MAG));
  });

  it("MIN_MAG gives the exact low color", () => {
    expect(magColor(MIN_MAG)).toBe("rgb(245, 230, 200)");
  });

  it("MAX_MAG gives the exact high color", () => {
    expect(magColor(MAX_MAG)).toBe("rgb(191, 78, 28)");
  });

  it("clamps below MIN_MAG instead of extrapolating", () => {
    expect(magColor(-100)).toBe(magColor(MIN_MAG));
  });

  it("clamps above MAX_MAG instead of extrapolating", () => {
    expect(magColor(100)).toBe(magColor(MAX_MAG));
  });
});

describe("magRadius", () => {
  it("null and MIN_MAG both give the minimum radius", () => {
    expect(magRadius(null)).toBe(magRadius(MIN_MAG));
  });

  it("MAX_MAG gives the maximum radius", () => {
    const maxRadius = magRadius(MAX_MAG);
    expect(magRadius(5)).toBeLessThan(maxRadius);
  });

  it("increases monotonically with magnitude", () => {
    expect(magRadius(1)).toBeLessThan(magRadius(3));
    expect(magRadius(3)).toBeLessThan(magRadius(6));
    expect(magRadius(6)).toBeLessThan(magRadius(9));
  });
});

describe("magBucketIndex", () => {
  it("null and MIN_MAG both land in bucket 0", () => {
    expect(magBucketIndex(null)).toBe(0);
    expect(magBucketIndex(MIN_MAG)).toBe(0);
  });

  it("MAX_MAG lands in the last bucket", () => {
    expect(magBucketIndex(MAX_MAG)).toBe(MAG_BUCKET_COUNT - 1);
  });

  it("never returns an out-of-range index for extreme inputs", () => {
    expect(magBucketIndex(-50)).toBeGreaterThanOrEqual(0);
    expect(magBucketIndex(1000)).toBeLessThan(MAG_BUCKET_COUNT);
  });
});

describe("MAG_BUCKET_COLORS", () => {
  it("has one color per bucket", () => {
    expect(MAG_BUCKET_COLORS).toHaveLength(MAG_BUCKET_COUNT);
  });

  it("every entry is a valid rgb() string", () => {
    for (const color of MAG_BUCKET_COLORS) {
      expect(color).toMatch(/^rgb\(\d+, \d+, \d+\)$/);
    }
  });
});

describe("MAG_BUCKET_FADE_DURATIONS_MS", () => {
  it("has one duration per bucket", () => {
    expect(MAG_BUCKET_FADE_DURATIONS_MS).toHaveLength(MAG_BUCKET_COUNT);
  });

  it("increases from the first bucket to the last (weaker quakes fade sooner)", () => {
    const first = MAG_BUCKET_FADE_DURATIONS_MS[0];
    const last = MAG_BUCKET_FADE_DURATIONS_MS[MAG_BUCKET_COUNT - 1];
    expect(first).toBeLessThan(last);
  });

  it("is monotonically non-decreasing across all buckets", () => {
    for (let i = 1; i < MAG_BUCKET_FADE_DURATIONS_MS.length; i++) {
      expect(MAG_BUCKET_FADE_DURATIONS_MS[i]).toBeGreaterThanOrEqual(
        MAG_BUCKET_FADE_DURATIONS_MS[i - 1]
      );
    }
  });
});
