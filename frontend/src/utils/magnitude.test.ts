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

  it("MIN_MAG gives the exact low (pale yellow) color", () => {
    expect(magColor(MIN_MAG)).toBe("rgb(255, 241, 150)");
  });

  it("MAX_MAG gives the exact high (dark maroon) color", () => {
    expect(magColor(MAX_MAG)).toBe("rgb(105, 0, 0)");
  });

  it("clamps below MIN_MAG instead of extrapolating", () => {
    expect(magColor(-100)).toBe(magColor(MIN_MAG));
  });

  it("clamps above MAX_MAG instead of extrapolating", () => {
    expect(magColor(100)).toBe(magColor(MAX_MAG));
  });

  it("every consecutive whole-number magnitude gets a distinguishable color", () => {
    // Regression guard for the low-end-compression bug: a curved mapping
    // used to cluster small quakes into nearly the same color.
    for (let m = MIN_MAG; m < MAX_MAG; m++) {
      expect(magColor(m)).not.toBe(magColor(m + 1));
    }
  });

  it("every consecutive whole-number magnitude is perceptually well-separated, not just technically different", () => {
    // Regression guard for "quakes blending together": a multi-hue gradient
    // should keep every adjacent step's Euclidean RGB distance comfortably
    // above a "just barely different" threshold.
    const parse = (c: string) => c.match(/\d+/g)!.map(Number);
    const distance = (a: number, b: number) => {
      const [r1, g1, b1] = parse(magColor(a));
      const [r2, g2, b2] = parse(magColor(b));
      return Math.sqrt((r2 - r1) ** 2 + (g2 - g1) ** 2 + (b2 - b1) ** 2);
    };
    for (let m = MIN_MAG; m < MAX_MAG; m++) {
      expect(distance(m, m + 1)).toBeGreaterThan(20);
    }
  });

  it("shifts hue (not just shade) across the range — high-magnitude red isn't just a darker low-magnitude yellow", () => {
    const parse = (c: string) => c.match(/\d+/g)!.map(Number);
    const [rLow, gLow] = parse(magColor(MIN_MAG));
    const [rHigh, gHigh] = parse(magColor(MAX_MAG));
    // A pure shade change would keep the same ratio between channels; a hue
    // change does not. Green drops much faster than red here (yellow has
    // roughly equal R/G; deep red has far more R than G), so the two ratios
    // should differ substantially.
    expect(gLow / rLow).toBeGreaterThan(gHigh / rHigh + 0.3);
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

  it("has exactly one bucket per whole-number magnitude", () => {
    expect(MAG_BUCKET_COUNT).toBe(MAX_MAG - MIN_MAG + 1);
  });

  it("assigns each whole-number magnitude to its own distinct bucket", () => {
    for (let m = MIN_MAG; m <= MAX_MAG; m++) {
      expect(magBucketIndex(m)).toBe(m);
    }
  });

  it("groups fractional magnitudes into the whole-number bucket below them", () => {
    expect(magBucketIndex(3.4)).toBe(3);
    expect(magBucketIndex(3.99)).toBe(3);
    expect(magBucketIndex(4.0)).toBe(4);
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

  it("the first bucket is exactly the low color and the last is exactly the high color", () => {
    expect(MAG_BUCKET_COLORS[0]).toBe("rgb(255, 241, 150)");
    expect(MAG_BUCKET_COLORS[MAG_BUCKET_COUNT - 1]).toBe("rgb(105, 0, 0)");
  });

  it("every bucket has a distinct color from its neighbors", () => {
    for (let i = 0; i < MAG_BUCKET_COLORS.length - 1; i++) {
      expect(MAG_BUCKET_COLORS[i]).not.toBe(MAG_BUCKET_COLORS[i + 1]);
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
