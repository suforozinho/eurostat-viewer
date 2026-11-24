// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { fakeFetch, readFixture } from "@/test/fixtures";
import { fetchSeries, isRetryable, isSeriesPayload, SeriesFetchError } from "./fetch-series";
import { loadSeries } from "./load";

const payload = await loadSeries("unemployment", {
  fetchImpl: fakeFetch(200, readFixture("unemployment")),
});

describe("isSeriesPayload", () => {
  it("accepts what the server sends", () => {
    expect(isSeriesPayload(payload)).toBe(true);
  });

  it.each([
    ["null", null],
    ["an array", []],
    ["missing observations", { ...payload, observations: undefined }],
    ["a string value", { ...payload, observations: [{ country: "PT", year: 2020, value: "6" }] }],
    ["a fractional year", { ...payload, years: [2020.5] }],
  ])("rejects %s", (_, value) => {
    expect(isSeriesPayload(value)).toBe(false);
  });
});

describe("fetchSeries", () => {
  async function codeFor(fetchImpl: typeof fetch) {
    vi.stubGlobal("fetch", fetchImpl);
    try {
      await fetchSeries("unemployment");
    } catch (error) {
      return (error as SeriesFetchError).code;
    } finally {
      vi.unstubAllGlobals();
    }
    return "resolved";
  }

  it("returns the payload", async () => {
    vi.stubGlobal("fetch", fakeFetch(200, payload));
    await expect(fetchSeries("unemployment")).resolves.toEqual(payload);
    vi.unstubAllGlobals();
  });

  it("passes the API's error code through", async () => {
    expect(await codeFor(fakeFetch(404, { error: { code: "no_data" } }))).toBe("no_data");
  });

  it("falls back to upstream for an unknown error body", async () => {
    expect(await codeFor(fakeFetch(500, { error: { code: "???" } }))).toBe("upstream");
  });

  it("maps a gateway timeout page to timeout", async () => {
    expect(await codeFor(fakeFetch(504, "<html>", "text/html"))).toBe("timeout");
  });

  it("flags a wrong shape as malformed", async () => {
    expect(await codeFor(fakeFetch(200, { observations: "nope" }))).toBe("malformed");
  });

  it("only retries temporary failures", () => {
    expect(isRetryable(new SeriesFetchError("timeout"))).toBe(true);
    expect(isRetryable(new SeriesFetchError("no_data"))).toBe(false);
    expect(isRetryable(new Error("x"))).toBe(false);
  });
});
