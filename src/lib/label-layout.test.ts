import { describe, expect, it } from "vitest";
import { spreadLabels } from "./label-layout";

describe("spreadLabels", () => {
  it("leaves labels that are far apart where they are", () => {
    expect(
      spreadLabels(
        [
          { key: "a", y: 10 },
          { key: "b", y: 100 },
        ],
        15,
      ),
    ).toEqual({ a: 10, b: 100 });
  });

  it("pushes two overlapping labels apart around their midpoint", () => {
    const out = spreadLabels(
      [
        { key: "pt", y: 100 },
        { key: "it", y: 104 },
      ],
      15,
    );
    expect(out.it - out.pt).toBe(15);
    expect((out.pt + out.it) / 2).toBe(102);
  });

  it("keeps the original top-to-bottom order", () => {
    const out = spreadLabels(
      [
        { key: "c", y: 52 },
        { key: "a", y: 50 },
        { key: "b", y: 51 },
      ],
      12,
    );
    expect(out.a).toBeLessThan(out.b);
    expect(out.b).toBeLessThan(out.c);
  });

  it("merges chains of overlaps until nothing overlaps", () => {
    const ys = [0, 10, 20, 30, 40].map((y, i) => ({ key: String(i), y }));
    const out = Object.values(spreadLabels(ys, 15)).sort((a, b) => a - b);
    for (let i = 1; i < out.length; i++) expect(out[i] - out[i - 1]).toBeGreaterThanOrEqual(15);
  });

  it("stays inside the bounds", () => {
    const out = spreadLabels(
      [
        { key: "a", y: 2 },
        { key: "b", y: 3 },
      ],
      15,
      { min: 0, max: 100 },
    );
    expect(Math.min(out.a, out.b)).toBeGreaterThanOrEqual(0);
  });
});
