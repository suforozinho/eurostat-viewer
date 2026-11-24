// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { REAL_FIXTURES, fakeFetch, readFixture } from "@/test/fixtures";
import { INDICATORS, buildEurostatUrl } from "../indicators";
import { SeriesError } from "../eurostat/errors";
import { loadSeries } from "./load";
import { SeriesPayloadSchema } from "./schema";

describe("loadSeries", () => {
  it.each(REAL_FIXTURES)("turns the %s fixture into a valid payload", async (id) => {
    const payload = await loadSeries(id, { fetchImpl: fakeFetch(200, readFixture(id)) });
    expect(SeriesPayloadSchema.safeParse(payload).success).toBe(true);
    expect(payload.indicator).toBe(id);
    expect(payload.countries.length).toBeGreaterThan(25);
    expect(payload.unitLabel).not.toBe("");
    expect(payload.sourceUrl).toContain(payload.dataset);
  });

  it("drops codes outside the European allow-list (FX duplicates FR, US is not European)", async () => {
    const payload = await loadSeries("life-expectancy", {
      fetchImpl: fakeFetch(200, readFixture("life-expectancy")),
    });
    const codes = new Set(payload.observations.map((o) => o.country));
    expect(codes.has("FX")).toBe(false);
    expect(codes.has("US")).toBe(false);
    expect(codes.has("FR")).toBe(true);
    expect(payload.countries.some((c) => c.code === "US")).toBe(false);
  });

  it("requests the catalog URL for the indicator", async () => {
    const fetchImpl = vi.fn(fakeFetch(200, readFixture("inflation")));
    await loadSeries("inflation", { fetchImpl });
    const inflation = INDICATORS.find((i) => i.id === "inflation")!;
    expect(fetchImpl).toHaveBeenCalledWith(buildEurostatUrl(inflation), expect.anything());
  });

  it("reports an empty dataset as no_data", async () => {
    const promise = loadSeries("unemployment", {
      fetchImpl: fakeFetch(200, readFixture("error-no-results")),
    });
    await expect(promise).rejects.toMatchObject({ code: "no_data" });
    await expect(promise).rejects.toBeInstanceOf(SeriesError);
  });

  it("reports an unfiltered dimension as malformed", async () => {
    await expect(
      loadSeries("unemployment", {
        fetchImpl: fakeFetch(200, readFixture("synthetic/unfiltered-unit")),
      }),
    ).rejects.toMatchObject({ code: "malformed" });
  });
});

describe("indicator catalog", () => {
  it("pins every dimension and asks for countries only", () => {
    for (const indicator of INDICATORS) {
      const url = new URL(buildEurostatUrl(indicator));
      expect(url.searchParams.get("geoLevel")).toBe("country");
      expect(url.searchParams.has("geo")).toBe(false); // geo + geoLevel is a 400
      expect(url.searchParams.get("sinceTimePeriod")).toBe("2000");
      expect(url.searchParams.get("format")).toBe("JSON");
      expect(url.searchParams.get("freq")).toBe("A");
    }
  });

  it("has unique ids and datasets", () => {
    expect(new Set(INDICATORS.map((i) => i.id)).size).toBe(INDICATORS.length);
    expect(new Set(INDICATORS.map((i) => i.dataset)).size).toBe(INDICATORS.length);
  });
});
