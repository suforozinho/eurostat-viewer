// @vitest-environment node
import { describe, expect, it } from "vitest";
import { REAL_FIXTURES, readFixture } from "@/test/fixtures";
import { JsonStatDatasetSchema, type JsonStatDataset } from "./schema";
import { JsonStatParseError, computeStrides, parseJsonStat } from "./parse";

function load(name: string): JsonStatDataset {
  return JsonStatDatasetSchema.parse(readFixture(name));
}

describe("computeStrides", () => {
  it("makes the last dimension change fastest", () => {
    expect(computeStrides([1, 1, 35, 23])).toEqual([805, 805, 23, 1]);
    expect(computeStrides([2, 3, 4])).toEqual([12, 4, 1]);
  });
});

describe.each(REAL_FIXTURES)("real Eurostat fixture: %s", (name) => {
  const dataset = load(name);
  const parsed = parseJsonStat(dataset);

  it("has one row per non-missing value", () => {
    const raw = dataset.value;
    const nonMissing = (Array.isArray(raw) ? raw : Object.values(raw)).filter(
      (v) => typeof v === "number",
    ).length;
    expect(parsed.observations.length).toBe(nonMissing);
    expect(parsed.observations.length).toBeGreaterThan(100);
  });

  it("has no duplicate country/year pairs", () => {
    const keys = parsed.observations.map((o) => `${o.country}-${o.year}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("lists only countries and years that have data, years ascending", () => {
    const countries = new Set(parsed.observations.map((o) => o.country));
    expect(parsed.countries.map((c) => c.code).sort()).toEqual([...countries].sort());
    expect(parsed.years).toEqual([...parsed.years].sort((a, b) => a - b));
    expect(parsed.countries.every((c) => c.name.length > 0)).toBe(true);
  });

  it("returns no regions or EU aggregates", () => {
    for (const { code } of parsed.countries) expect(code).toMatch(/^[A-Z]{2}$/);
  });

  it("matches a value looked up by hand from the raw response", () => {
    // Recompute one cell independently of the parser's stride logic.
    const sample = parsed.observations[Math.floor(parsed.observations.length / 2)];
    const geoIndex = dataset.dimension.geo.category.index as Record<string, number>;
    const timeIndex = dataset.dimension.time.category.index as Record<string, number>;
    const timeSize = dataset.size[dataset.id.indexOf("time")];
    // geo and time are the last two dimensions in Eurostat responses; others have size 1.
    expect(dataset.id.slice(-2)).toEqual(["geo", "time"]);
    const flat = geoIndex[sample.country] * timeSize + timeIndex[String(sample.year)];
    expect((dataset.value as Record<string, number>)[String(flat)]).toBe(sample.value);
  });

  it("keeps Eurostat's English labels", () => {
    expect(parsed.label.length).toBeGreaterThan(0);
    expect(parsed.fixedLabels.unit).toBeTruthy();
  });
});

describe("known values", () => {
  it("reads Portugal's 2024 unemployment rate", () => {
    const parsed = parseJsonStat(load("unemployment"));
    const pt2024 = parsed.observations.find((o) => o.country === "PT" && o.year === 2024);
    expect(pt2024?.value).toBeGreaterThan(3);
    expect(pt2024?.value).toBeLessThan(12);
    expect(parsed.countries.find((c) => c.code === "PT")?.name).toBe("Portugal");
  });

  it("reads status flags from the sparse status object", () => {
    const parsed = parseJsonStat(load("unemployment"));
    const flags = new Set(parsed.observations.map((o) => o.flag).filter(Boolean));
    expect(flags.size).toBeGreaterThan(0);
  });
});

describe("empty results", () => {
  it("parses a no-results response (zero-sized time) to zero rows", () => {
    const parsed = parseJsonStat(load("error-no-results"));
    expect(parsed.observations).toEqual([]);
    expect(parsed.countries).toEqual([]);
    expect(parsed.years).toEqual([]);
  });

  it("parses an invalid-filter response (zero-sized geo, unfiltered age) to zero rows", () => {
    const parsed = parseJsonStat(load("error-invalid"));
    expect(parsed.observations).toEqual([]);
  });
});

describe("dense array values", () => {
  const parsed = parseJsonStat(load("synthetic/array-values"));

  it("maps array positions to country and year, skipping nulls", () => {
    expect(parsed.observations).toEqual([
      { country: "PT", year: 2023, value: 6.5, flag: null },
      { country: "PT", year: 2024, value: 6.4, flag: "p" },
      { country: "ES", year: 2023, value: 12.1, flag: null },
    ]);
  });

  it("drops countries without any value", () => {
    expect(parsed.countries).toEqual([
      { code: "PT", name: "Portugal" },
      { code: "ES", name: "Spain" },
    ]);
    expect(parsed.years).toEqual([2023, 2024]);
  });

  it("supports category index given as an array", () => {
    expect(parsed.fixedLabels).toEqual({ unit: "Percentage" });
  });
});

describe("invalid input", () => {
  it("rejects a malformed response at the schema step", () => {
    const result = JsonStatDatasetSchema.safeParse(readFixture("synthetic/malformed"));
    expect(result.success).toBe(false);
  });

  it("rejects non-JSON-stat objects", () => {
    expect(JsonStatDatasetSchema.safeParse({ hello: "world" }).success).toBe(false);
    expect(JsonStatDatasetSchema.safeParse(null).success).toBe(false);
  });

  it("refuses a dimension that was not filtered to one value", () => {
    expect(() => parseJsonStat(load("synthetic/unfiltered-unit"))).toThrow(JsonStatParseError);
    expect(() => parseJsonStat(load("synthetic/unfiltered-unit"))).toThrow(/unit/);
  });

  it("refuses non-annual time periods", () => {
    const dataset = load("synthetic/array-values");
    dataset.dimension.time.category.index = ["2024-Q1", "2024-Q2"];
    expect(() => parseJsonStat(dataset)).toThrow(/annual/);
  });

  it("refuses a dataset without a geo dimension", () => {
    const dataset = load("synthetic/array-values");
    expect(() => parseJsonStat(dataset, { geoDimension: "country" })).toThrow(/country/);
  });

  it("treats NaN or string values as missing", () => {
    const dataset = load("synthetic/array-values");
    (dataset.value as unknown[])[0] = "6.5";
    const parsed = parseJsonStat(dataset);
    expect(parsed.observations.find((o) => o.country === "PT" && o.year === 2023)).toBeUndefined();
  });

  it("applies a single string status to every value", () => {
    const dataset = load("synthetic/array-values");
    dataset.status = "e";
    const parsed = parseJsonStat(dataset);
    expect(parsed.observations.every((o) => o.flag === "e")).toBe(true);
  });
});
