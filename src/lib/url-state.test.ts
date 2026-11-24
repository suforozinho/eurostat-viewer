// @vitest-environment node
import { describe, expect, it } from "vitest";
import { DEFAULT_COUNTRIES, MAX_COUNTRIES, parseState, serializeState } from "./url-state";

const parse = (query: string) => parseState(new URLSearchParams(query));

describe("parseState", () => {
  it("uses defaults for an empty URL", () => {
    expect(parse("")).toEqual({
      indicator: "unemployment",
      countries: DEFAULT_COUNTRIES,
      from: null,
      to: null,
      year: null,
      view: "trend",
      display: "chart",
    });
  });

  it("reads every field", () => {
    expect(
      parse(
        "indicator=inflation&countries=PT,EL&from=2010&to=2020&year=2019&view=map&display=table",
      ),
    ).toEqual({
      indicator: "inflation",
      countries: ["PT", "EL"],
      from: 2010,
      to: 2020,
      year: 2019,
      view: "map",
      display: "table",
    });
  });

  it("falls back on unknown values instead of failing", () => {
    const state = parse("indicator=nope&view=pie&display=3d&year=abc&from=12");
    expect(state.indicator).toBe("unemployment");
    expect(state.view).toBe("trend");
    expect(state.display).toBe("chart");
    expect(state.year).toBeNull();
    expect(state.from).toBeNull();
  });

  it("cleans country codes: case, junk, duplicates and the limit", () => {
    expect(parse("countries=pt, es,,PT,xyz,1,de").countries).toEqual(["PT", "ES", "DE"]);
    expect(parse("countries=AT,BE,BG,CY,CZ,DE,DK").countries).toHaveLength(MAX_COUNTRIES);
  });

  it("distinguishes 'no countries' from 'default countries'", () => {
    expect(parse("countries=").countries).toEqual([]);
    expect(parse("indicator=inflation").countries).toEqual(DEFAULT_COUNTRIES);
  });

  it("swaps an inverted year range", () => {
    const state = parse("from=2020&to=2010");
    expect([state.from, state.to]).toEqual([2010, 2020]);
  });
});

describe("serializeState", () => {
  it("round-trips through parseState", () => {
    const state = parse(
      "indicator=internet-use&countries=PT,FI&from=2012&to=2024&year=2023&view=ranking&display=table",
    );
    expect(parse(serializeState(state))).toEqual(state);
  });

  it("writes keys in a stable order with readable commas and omits defaults", () => {
    const query = serializeState(parse("view=trend&countries=PT,ES&indicator=inflation"));
    expect(query).toBe("indicator=inflation&countries=PT,ES");
  });

  it("keeps an empty country list explicit", () => {
    expect(serializeState(parse("countries="))).toBe("indicator=unemployment&countries=");
  });
});
