// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { SeriesPayload } from "./series/schema";
import {
  assignSlots,
  countriesWithData,
  latestWellCoveredYear,
  rankingRows,
  resolveYears,
  trendRows,
} from "./derive";

function payload(observations: [string, number, number][]): SeriesPayload {
  const years = [...new Set(observations.map((o) => o[1]))].sort();
  const codes = [...new Set(observations.map((o) => o[0]))];
  return {
    indicator: "unemployment",
    dataset: "une_rt_a",
    datasetLabel: "Test",
    unitLabel: "Percent",
    updated: null,
    sourceUrl: "https://example.test",
    countries: codes.map((code) => ({ code, name: code })),
    years,
    observations: observations.map(([country, year, value]) => ({
      country,
      year,
      value,
      flag: null,
    })),
  };
}

// Five countries report 2020-2022; only one has published 2023 so far.
const sample = payload([
  ["PT", 2020, 7],
  ["ES", 2020, 15],
  ["DE", 2020, 4],
  ["FR", 2020, 8],
  ["IT", 2020, 9],
  ["PT", 2021, 6.5],
  ["ES", 2021, 14],
  ["DE", 2021, 3.6],
  ["FR", 2021, 7.9],
  ["IT", 2021, 9.5],
  ["PT", 2022, 6],
  ["ES", 2022, 13],
  ["DE", 2022, 3.1],
  ["FR", 2022, 7.3],
  ["PT", 2023, 6.4],
]);

describe("latestWellCoveredYear", () => {
  it("skips a latest year that only a few countries have published", () => {
    expect(latestWellCoveredYear(sample)).toBe(2022); // 4 of 5 = 80%
  });
});

describe("resolveYears", () => {
  it("defaults to the full recent window and the well-covered year", () => {
    expect(resolveYears(sample, { from: null, to: null, year: null })).toEqual({
      from: 2020,
      to: 2023,
      year: 2022,
    });
  });

  it("clamps requested years to what the dataset has", () => {
    expect(resolveYears(sample, { from: 1990, to: 2050, year: 1990 })).toEqual({
      from: 2020,
      to: 2023,
      year: 2022,
    });
  });

  it("keeps a valid requested year", () => {
    expect(resolveYears(sample, { from: 2021, to: 2022, year: 2023 }).year).toBe(2023);
  });
});

describe("trendRows", () => {
  it("builds one row per year with nulls for gaps", () => {
    const rows = trendRows(sample, ["IT", "PT", "XX"], 2021, 2023);
    expect(rows).toEqual([
      { year: 2021, IT: 9.5, PT: 6.5, XX: null },
      { year: 2022, IT: null, PT: 6, XX: null },
      { year: 2023, IT: null, PT: 6.4, XX: null },
    ]);
    expect(countriesWithData(rows, ["IT", "PT", "XX"])).toEqual(["IT", "PT"]);
  });
});

describe("rankingRows", () => {
  it("sorts highest first and leaves out countries without a value", () => {
    expect(rankingRows(sample, 2022).map((r) => r.code)).toEqual(["ES", "FR", "PT", "DE"]);
  });
});

describe("assignSlots", () => {
  it("assigns slots in order for a fresh selection", () => {
    expect(assignSlots({}, ["PT", "ES", "DE"], 5)).toEqual({ PT: 0, ES: 1, DE: 2 });
  });

  it("keeps colors stable when a country is removed", () => {
    const before = assignSlots({}, ["PT", "ES", "DE"], 5);
    expect(assignSlots(before, ["PT", "DE"], 5)).toEqual({ PT: 0, DE: 2 });
  });

  it("gives a new country the first free slot", () => {
    expect(assignSlots({ PT: 0, DE: 2 }, ["PT", "DE", "FR"], 5)).toEqual({ PT: 0, DE: 2, FR: 1 });
  });
});
