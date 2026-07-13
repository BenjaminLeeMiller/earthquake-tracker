import { describe, it, expect } from "vitest";
import { MIN_SPEED, MAX_SPEED, computeDefaultPlaybackSpeed } from "./playbackSpeed";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("computeDefaultPlaybackSpeed", () => {
  it("a 30-day range gives ~1.0 day/sec (the previous flat default)", () => {
    const speed = computeDefaultPlaybackSpeed(0, 30 * DAY_MS);
    expect(speed).toBeCloseTo(1, 5);
  });

  it("a 7-day range gives ~7/30 days/sec", () => {
    const speed = computeDefaultPlaybackSpeed(0, 7 * DAY_MS);
    expect(speed).toBeCloseTo(7 / 30, 5);
  });

  it("scales linearly with the range's duration", () => {
    const short = computeDefaultPlaybackSpeed(0, 10 * DAY_MS);
    const long = computeDefaultPlaybackSpeed(0, 20 * DAY_MS);
    expect(long).toBeCloseTo(short * 2, 5);
  });

  it("clamps to MIN_SPEED for a very short range", () => {
    const speed = computeDefaultPlaybackSpeed(0, 1000); // 1 second
    expect(speed).toBe(MIN_SPEED);
  });

  it("clamps to MAX_SPEED for a very long range", () => {
    const speed = computeDefaultPlaybackSpeed(0, 365 * 50 * DAY_MS); // 50 years
    expect(speed).toBe(MAX_SPEED);
  });

  it("is independent of the absolute start time, only the duration matters", () => {
    const a = computeDefaultPlaybackSpeed(0, 7 * DAY_MS);
    const b = computeDefaultPlaybackSpeed(1_700_000_000_000, 1_700_000_000_000 + 7 * DAY_MS);
    expect(a).toBeCloseTo(b, 10);
  });
});
