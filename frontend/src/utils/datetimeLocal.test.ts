import { describe, it, expect } from "vitest";
import { msToDatetimeLocalValue, datetimeLocalValueToMs } from "./datetimeLocal";

describe("msToDatetimeLocalValue", () => {
  it("zero-pads single-digit month/day/hour/minute", () => {
    const ms = new Date(2026, 0, 5, 3, 7, 0, 0).getTime(); // Jan 5 2026, 03:07 local
    expect(msToDatetimeLocalValue(ms)).toBe("2026-01-05T03:07");
  });

  it("formats double-digit values without extra padding", () => {
    const ms = new Date(2026, 10, 23, 14, 45, 0, 0).getTime(); // Nov 23 2026, 14:45 local
    expect(msToDatetimeLocalValue(ms)).toBe("2026-11-23T14:45");
  });

  it("truncates seconds/ms (datetime-local's value has minute precision)", () => {
    const ms = new Date(2026, 5, 1, 9, 30, 45, 500).getTime();
    expect(msToDatetimeLocalValue(ms)).toBe("2026-06-01T09:30");
  });
});

describe("datetimeLocalValueToMs", () => {
  it("round-trips with msToDatetimeLocalValue for a minute-aligned timestamp", () => {
    const ms = new Date(2026, 3, 10, 18, 22, 0, 0).getTime();
    const value = msToDatetimeLocalValue(ms);
    expect(datetimeLocalValueToMs(value)).toBe(ms);
  });

  it("returns null for an empty string", () => {
    expect(datetimeLocalValueToMs("")).toBeNull();
  });

  it("returns null for an unparseable string", () => {
    expect(datetimeLocalValueToMs("not-a-date")).toBeNull();
  });
});
