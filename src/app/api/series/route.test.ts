// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { SeriesResult } from "@/lib/series/get-series";

const getSeries = vi.fn<(id: string) => Promise<SeriesResult>>();
vi.mock("@/lib/series/get-series", () => ({ getSeries: (id: string) => getSeries(id) }));

const { GET } = await import("./route");

const call = (query: string) => GET(new NextRequest(`http://localhost/api/series?${query}`));

describe("GET /api/series", () => {
  beforeEach(() => getSeries.mockReset());

  it("rejects unknown indicators without calling Eurostat", async () => {
    const res = await call("indicator=../../secrets");
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: { code: "invalid_indicator" } });
    expect(getSeries).not.toHaveBeenCalled();
  });

  it("rejects a missing indicator", async () => {
    expect((await call("")).status).toBe(400);
  });

  it("returns the payload with long cache headers", async () => {
    const data = { indicator: "unemployment" } as never;
    getSeries.mockResolvedValue({ ok: true, data });
    const res = await call("indicator=unemployment");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(data);
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=21600");
  });

  it.each([
    ["no_data", 404],
    ["not_found", 404],
    ["bad_request", 502],
    ["too_large", 502],
    ["upstream", 502],
    ["timeout", 504],
  ] as const)("maps %s to HTTP %i with a short cache", async (code, status) => {
    getSeries.mockResolvedValue({ ok: false, code });
    const res = await call("indicator=inflation");
    expect(res.status).toBe(status);
    expect(await res.json()).toEqual({ error: { code } });
    expect(res.headers.get("Cache-Control")).toBe("public, s-maxage=60");
  });
});
