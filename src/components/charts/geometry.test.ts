// @vitest-environment node
import { describe, expect, it } from "vitest";
import { barPath, linePath, nearestIndex, yearTicks } from "./geometry";

describe("linePath", () => {
  it("draws a continuous line", () => {
    expect(
      linePath([
        { x: 0, y: 10 },
        { x: 5, y: 20 },
        { x: 10, y: 15 },
      ]),
    ).toBe("M0,10L5,20L10,15");
  });

  it("leaves a gap for missing values instead of bridging them", () => {
    expect(linePath([{ x: 0, y: 1 }, null, { x: 10, y: 2 }, { x: 15, y: 3 }])).toBe(
      "M0,1M10,2L15,3",
    );
  });

  it("returns an empty path when there is nothing to draw", () => {
    expect(linePath([null, null])).toBe("");
  });
});

describe("yearTicks", () => {
  it("shows every year when there is room", () => {
    expect(yearTicks(2020, 2025, 600)).toEqual([2020, 2021, 2022, 2023, 2024, 2025]);
  });

  it("thins out on narrow charts but always keeps the last year", () => {
    const ticks = yearTicks(2000, 2025, 300);
    expect(ticks.at(-1)).toBe(2025);
    expect(ticks.length).toBeLessThanOrEqual(Math.floor(300 / 44));
    expect(ticks).toEqual([2000, 2005, 2010, 2015, 2020, 2025]);
  });

  it("handles a single year", () => {
    expect(yearTicks(2024, 2024, 400)).toEqual([2024]);
  });
});

describe("barPath", () => {
  it("rounds only the right end of a positive bar", () => {
    const d = barPath(0, 100, 0, 20);
    expect(d.startsWith("M0,0H96Q100,0")).toBe(true);
    expect(d.endsWith("H0Z")).toBe(true);
  });

  it("rounds only the left end of a negative bar", () => {
    const d = barPath(50, 20, 0, 20);
    expect(d.startsWith("M50,0H24Q20,0")).toBe(true);
    expect(d.endsWith("H50Z")).toBe(true);
  });

  it("never uses a radius larger than half the bar", () => {
    expect(barPath(0, 2, 0, 20)).toContain("H1Q2,0 2,1");
  });
});

describe("nearestIndex", () => {
  it("finds the closest position", () => {
    expect(nearestIndex([0, 10, 20, 30], 14)).toBe(1);
    expect(nearestIndex([0, 10, 20, 30], 16)).toBe(2);
    expect(nearestIndex([0, 10, 20, 30], -50)).toBe(0);
  });
});
