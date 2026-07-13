import { describe, it, expect } from "vitest";
import { Vector3 } from "three";
import { horizonThreshold, isFacingCamera } from "./horizon";

describe("horizonThreshold", () => {
  it("is the reciprocal of camera distance", () => {
    expect(horizonThreshold(1)).toBe(1);
    expect(horizonThreshold(2)).toBe(0.5);
    expect(horizonThreshold(4)).toBe(0.25);
  });
});

describe("isFacingCamera", () => {
  it("a point facing directly at the camera is always visible", () => {
    const cameraDir = new Vector3(0, 0, 1);
    const dir: [number, number, number] = [0, 0, 1];
    expect(isFacingCamera(dir, cameraDir, horizonThreshold(2))).toBe(true);
  });

  it("a point directly opposite the camera is never visible", () => {
    const cameraDir = new Vector3(0, 0, 1);
    const dir: [number, number, number] = [0, 0, -1];
    expect(isFacingCamera(dir, cameraDir, horizonThreshold(2))).toBe(false);
  });

  it("is visible exactly at the threshold boundary", () => {
    const cameraDir = new Vector3(0, 0, 1);
    const threshold = 0.5;
    // dot(dir, cameraDir) == 0.5 exactly
    const dir: [number, number, number] = [Math.sqrt(0.75), 0, 0.5];
    expect(isFacingCamera(dir, cameraDir, threshold)).toBe(true);
  });

  it("is not visible just past the threshold boundary", () => {
    const cameraDir = new Vector3(0, 0, 1);
    const threshold = 0.5;
    const dir: [number, number, number] = [Math.sqrt(1 - 0.49 * 0.49), 0, 0.49];
    expect(isFacingCamera(dir, cameraDir, threshold)).toBe(false);
  });
});
