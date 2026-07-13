import { describe, it, expect } from "vitest";
import {
  mmiAtDistance,
  rCutoffKm,
  waveLifetimeSeconds,
  waveRadiusKmAtAge,
  waveOpacity,
  angularRadius,
  smallCircleLocalPoint,
  buildRingIndices,
  MAX_RELIABLE_WINDOW_MS,
} from "./seismicWave";
import { MIN_SPEED, TARGET_DURATION_SECONDS } from "./playbackSpeed";
import { EARTH_RADIUS_KM } from "./grid";

describe("MAX_RELIABLE_WINDOW_MS", () => {
  it("is derived from playbackSpeed's own clamping constants (~30 minutes today)", () => {
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    expect(MAX_RELIABLE_WINDOW_MS).toBeCloseTo(MIN_SPEED * TARGET_DURATION_SECONDS * MS_PER_DAY, 5);
    expect(MAX_RELIABLE_WINDOW_MS).toBeCloseTo(30 * 60 * 1000, 0);
  });
});

describe("mmiAtDistance", () => {
  it("matches hand-computed values", () => {
    // MMI(R) = M - 2.5*log10(R) + 1.5
    expect(mmiAtDistance(6, 10)).toBeCloseTo(6 - 2.5 * 1 + 1.5, 10);
    expect(mmiAtDistance(6, 100)).toBeCloseTo(6 - 2.5 * 2 + 1.5, 10);
  });

  it("is monotonically decreasing in distance", () => {
    const a = mmiAtDistance(7, 10);
    const b = mmiAtDistance(7, 50);
    const c = mmiAtDistance(7, 200);
    expect(a).toBeGreaterThan(b);
    expect(b).toBeGreaterThan(c);
  });
});

describe("rCutoffKm / waveLifetimeSeconds", () => {
  const table: [number, number, number][] = [
    // [magnitude, expected rCutoffKm-derived lifetime seconds, tolerance]
    [3, 4.2, 0.5],
    [6, 66, 1],
    [8, 419, 2],
    [9, 1052, 2],
  ];

  it("matches the sanity-checked lifetime table", () => {
    for (const [mag, expectedSeconds, tolerance] of table) {
      expect(waveLifetimeSeconds(mag)).toBeGreaterThan(expectedSeconds - tolerance);
      expect(waveLifetimeSeconds(mag)).toBeLessThan(expectedSeconds + tolerance);
    }
  });

  it("round-trips: mmiAtDistance(M, rCutoffKm(M)) is exactly the cutoff (1.0)", () => {
    for (const mag of [3, 5, 6.5, 8, 9]) {
      expect(mmiAtDistance(mag, rCutoffKm(mag))).toBeCloseTo(1.0, 8);
    }
  });

  it("only exceeds MAX_RELIABLE_WINDOW_MS beyond roughly M9.6", () => {
    const windowSeconds = MAX_RELIABLE_WINDOW_MS / 1000;
    expect(waveLifetimeSeconds(9.5)).toBeLessThan(windowSeconds);
    expect(waveLifetimeSeconds(9.7)).toBeGreaterThan(windowSeconds);
  });
});

describe("waveRadiusKmAtAge", () => {
  it("returns null before birth", () => {
    expect(waveRadiusKmAtAge(6, -1)).toBeNull();
  });

  it("returns null after death", () => {
    const lifetime = waveLifetimeSeconds(6);
    expect(waveRadiusKmAtAge(6, lifetime + 1)).toBeNull();
  });

  it("grows at P-wave speed (6 km/s) for small ages", () => {
    expect(waveRadiusKmAtAge(6, 10)).toBeCloseTo(60, 8);
    expect(waveRadiusKmAtAge(6, 1)).toBeCloseTo(6, 8);
  });

  it("clamps at the cutoff boundary", () => {
    const lifetime = waveLifetimeSeconds(6);
    const cutoff = rCutoffKm(6);
    expect(waveRadiusKmAtAge(6, lifetime)).toBeCloseTo(cutoff, 6);
  });
});

describe("waveOpacity", () => {
  it("is 1 at the minimum radius (birth)", () => {
    expect(waveOpacity(6, 1)).toBeCloseTo(1, 8);
  });

  it("is 0 exactly at the cutoff", () => {
    expect(waveOpacity(6, rCutoffKm(6))).toBeCloseTo(0, 6);
  });

  it("is monotonically decreasing in distance", () => {
    const a = waveOpacity(6, 1);
    const b = waveOpacity(6, 20);
    const c = waveOpacity(6, 50);
    expect(a).toBeGreaterThan(b);
    expect(b).toBeGreaterThan(c);
  });

  it("clamps to 0 past the cutoff", () => {
    expect(waveOpacity(6, rCutoffKm(6) * 2)).toBe(0);
  });
});

describe("angularRadius", () => {
  it("converts km to radians using EARTH_RADIUS_KM", () => {
    expect(angularRadius(EARTH_RADIUS_KM)).toBeCloseTo(1, 10);
    expect(angularRadius(0)).toBe(0);
  });
});

describe("smallCircleLocalPoint", () => {
  const UP: [number, number, number] = [0, 1, 0];

  it("every sampled phi is equidistant from the pole (dot product == cos(theta))", () => {
    for (const theta of [0.1, 0.5, 1.0, 1.5]) {
      for (let phi = 0; phi < Math.PI * 2; phi += Math.PI / 6) {
        const p = smallCircleLocalPoint(theta, phi);
        const dot = p[0] * UP[0] + p[1] * UP[1] + p[2] * UP[2];
        expect(dot).toBeCloseTo(Math.cos(theta), 10);
      }
    }
  });

  it("every point is unit length", () => {
    for (const theta of [0.2, 0.9, 2.0]) {
      for (let phi = 0; phi < Math.PI * 2; phi += Math.PI / 4) {
        const p = smallCircleLocalPoint(theta, phi);
        const len = Math.sqrt(p[0] * p[0] + p[1] * p[1] + p[2] * p[2]);
        expect(len).toBeCloseTo(1, 10);
      }
    }
  });
});

describe("buildRingIndices", () => {
  it("has length segments*6", () => {
    expect(buildRingIndices(8)).toHaveLength(48);
    expect(buildRingIndices(64)).toHaveLength(384);
  });

  it("max index stays below segments*4", () => {
    const segments = 16;
    const idx = buildRingIndices(segments);
    expect(Math.max(...idx)).toBeLessThan(segments * 4);
  });

  it("each quad's 6 indices reference only its own 4-vertex block", () => {
    const segments = 10;
    const idx = buildRingIndices(segments);
    for (let i = 0; i < segments; i++) {
      const base = i * 4;
      const quadIndices = idx.slice(i * 6, i * 6 + 6);
      for (const v of quadIndices) {
        expect(v).toBeGreaterThanOrEqual(base);
        expect(v).toBeLessThan(base + 4);
      }
    }
  });
});
