import { describe, it, expect } from "vitest";
import {
  EARTH_RADIUS_KM,
  GLOBE_RADIUS,
  latLonToXYZ,
  depthToRadius,
  latLonDepthToXYZ,
} from "./grid";

describe("GLOBE_RADIUS", () => {
  it("is exactly 1 (EarthSphere and camera-clearance math depend on this)", () => {
    expect(GLOBE_RADIUS).toBe(1);
  });
});

describe("latLonToXYZ", () => {
  it("north pole", () => {
    const [x, y, z] = latLonToXYZ(90, 0);
    expect(x).toBeCloseTo(0, 10);
    expect(y).toBeCloseTo(1, 10);
    expect(z).toBeCloseTo(0, 10);
  });

  it("south pole", () => {
    const [x, y, z] = latLonToXYZ(-90, 0);
    expect(x).toBeCloseTo(0, 10);
    expect(y).toBeCloseTo(-1, 10);
    expect(z).toBeCloseTo(0, 10);
  });

  it("equator, prime meridian", () => {
    const [x, y, z] = latLonToXYZ(0, 0);
    expect(x).toBeCloseTo(0, 10);
    expect(y).toBeCloseTo(0, 10);
    expect(z).toBeCloseTo(1, 10);
  });

  it("preserves unit length", () => {
    const [x, y, z] = latLonToXYZ(45, 90);
    expect(Math.sqrt(x * x + y * y + z * z)).toBeCloseTo(1, 10);
  });

  it("scales with the given radius", () => {
    const [x, y, z] = latLonToXYZ(30, 60, 2.0);
    expect(Math.sqrt(x * x + y * y + z * z)).toBeCloseTo(2, 10);
  });
});

describe("depthToRadius", () => {
  it("null depth gives the full surface radius", () => {
    expect(depthToRadius(null, 1)).toBe(1);
  });

  it("zero depth gives the full surface radius", () => {
    expect(depthToRadius(0, 1)).toBe(1);
  });

  it("increasing depth shrinks the radius", () => {
    const shallow = depthToRadius(10, 1);
    const deep = depthToRadius(100, 1);
    expect(deep).toBeLessThan(shallow);
    expect(shallow).toBeLessThan(1);
  });

  it("clamps at the 0.05 floor for very large depths", () => {
    expect(depthToRadius(999999, 1)).toBe(0.05);
  });

  it("scales relative to the given surfaceRadius", () => {
    expect(depthToRadius(null, 2)).toBe(2);
  });
});

describe("latLonDepthToXYZ", () => {
  it("a deeper quake has a smaller magnitude than a shallow one at the same lat/lon", () => {
    const shallow = latLonDepthToXYZ(35, 139, 5, 1);
    const deep = latLonDepthToXYZ(35, 139, 500, 1);
    const mag = (v: [number, number, number]) => Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2);
    expect(mag(deep)).toBeLessThan(mag(shallow));
  });

  it("null depth matches the plain surface point", () => {
    const withNull = latLonDepthToXYZ(10, 20, null, 1);
    const surface = latLonToXYZ(10, 20, 1);
    expect(withNull[0]).toBeCloseTo(surface[0], 10);
    expect(withNull[1]).toBeCloseTo(surface[1], 10);
    expect(withNull[2]).toBeCloseTo(surface[2], 10);
  });
});

describe("EARTH_RADIUS_KM", () => {
  it("is approximately 6371 km", () => {
    expect(EARTH_RADIUS_KM).toBeGreaterThan(6370);
    expect(EARTH_RADIUS_KM).toBeLessThan(6372);
  });
});
