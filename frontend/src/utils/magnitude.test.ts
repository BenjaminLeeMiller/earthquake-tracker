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

  it("within the practical 2.5–7 band, every whole-number magnitude is perceptually well-separated", () => {
    // Regression guard for "quakes blending together": the color gradient
    // is scoped to where real data actually lives (COLOR_MIN_MAG..
    // COLOR_MAX_MAG, 2.5–7), so every adjacent step's Euclidean RGB
    // distance should stay comfortably above a "just barely different"
    // threshold across that band.
    const parse = (c: string) => c.match(/\d+/g)!.map(Number);
    const distance = (a: number, b: number) => {
      const [r1, g1, b1] = parse(magColor(a));
      const [r2, g2, b2] = parse(magColor(b));
      return Math.sqrt((r2 - r1) ** 2 + (g2 - g1) ** 2 + (b2 - b1) ** 2);
    };
    for (let m = 3; m < 7; m++) {
      expect(distance(m, m + 1)).toBeGreaterThan(20);
    }
  });

  it("clamps every magnitude below the practical band to the same low color", () => {
    expect(magColor(0)).toBe(magColor(1));
    expect(magColor(1)).toBe(magColor(2));
    expect(magColor(2)).toBe(magColor(2.5));
  });

  it("clamps every magnitude above the practical band to the same high color", () => {
    expect(magColor(7)).toBe(magColor(8));
    expect(magColor(8)).toBe(magColor(9));
    expect(magColor(9)).toBe(magColor(10));
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

  it("has a visible floor — even the smallest quake isn't a sub-pixel speck", () => {
    expect(magRadius(MIN_MAG)).toBeGreaterThanOrEqual(0.006);
  });

  it("strictly increases across whole-number magnitudes within the practical 2.5–7 band", () => {
    for (let m = 3; m < 7; m++) {
      expect(magRadius(m)).toBeLessThan(magRadius(m + 1));
    }
  });

  it("each whole-number step in the band is meaningfully bigger, not marginal", () => {
    // Regression guard for the old full-domain curve, under which M3–M5
    // (most of the data) differed by fractions of a pixel.
    for (let m = 3; m < 7; m++) {
      expect(magRadius(m + 1) / magRadius(m)).toBeGreaterThan(1.2);
    }
  });

  it("clamps below the practical band to the same floor radius", () => {
    expect(magRadius(0)).toBe(magRadius(2.5));
    expect(magRadius(1)).toBe(magRadius(2.5));
  });

  it("clamps above the practical band to the same max radius", () => {
    expect(magRadius(7)).toBe(magRadius(MAX_MAG));
    expect(magRadius(8)).toBe(magRadius(10));
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

  it("buckets within the practical 2.5–7 band (magnitudes 3–7) are each distinct from their neighbors", () => {
    for (let i = 3; i < 7; i++) {
      expect(MAG_BUCKET_COLORS[i]).not.toBe(MAG_BUCKET_COLORS[i + 1]);
    }
  });

  it("buckets below the practical band (magnitudes 0–2) share the same clamped low color", () => {
    expect(MAG_BUCKET_COLORS[0]).toBe(MAG_BUCKET_COLORS[1]);
    expect(MAG_BUCKET_COLORS[1]).toBe(MAG_BUCKET_COLORS[2]);
  });

  it("buckets above the practical band (magnitudes 7–10) share the same clamped high color", () => {
    expect(MAG_BUCKET_COLORS[7]).toBe(MAG_BUCKET_COLORS[8]);
    expect(MAG_BUCKET_COLORS[8]).toBe(MAG_BUCKET_COLORS[9]);
    expect(MAG_BUCKET_COLORS[9]).toBe(MAG_BUCKET_COLORS[10]);
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
