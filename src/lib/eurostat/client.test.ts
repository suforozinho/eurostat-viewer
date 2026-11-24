// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { fakeFetch, readFixture } from "@/test/fixtures";
import { fetchDataset, fetchDatasetQueued } from "./client";
import { SeriesError, codeForEurostatStatus, httpStatusFor } from "./errors";

const URL_A = "https://example.test/a";
const URL_B = "https://example.test/b";

async function errorCode(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(SeriesError);
    return (error as SeriesError).code;
  }
  throw new Error("expected the promise to reject");
}

describe("fetchDataset", () => {
  it("returns a validated dataset on success", async () => {
    const dataset = await fetchDataset(URL_A, {
      fetchImpl: fakeFetch(200, readFixture("unemployment")),
    });
    expect(dataset.class).toBe("dataset");
    expect(dataset.id).toContain("geo");
  });

  it("maps Eurostat's 404 body to not_found", async () => {
    const fetchImpl = fakeFetch(404, readFixture("error-404"));
    expect(await errorCode(fetchDataset(URL_A, { fetchImpl }))).toBe("not_found");
  });

  it("maps 400 with error id 100 to no_data", async () => {
    const body = { error: [{ status: 400, id: 100, label: "No results found" }] };
    expect(await errorCode(fetchDataset(URL_A, { fetchImpl: fakeFetch(400, body) }))).toBe(
      "no_data",
    );
  });

  it.each([140, 150])("maps 400 with error id %i to bad_request", async (id) => {
    const body = { error: [{ status: 400, id, label: "Bad" }] };
    expect(await errorCode(fetchDataset(URL_A, { fetchImpl: fakeFetch(400, body) }))).toBe(
      "bad_request",
    );
  });

  it("maps 413 to too_large", async () => {
    const body = { error: [{ status: 413, id: 0, label: "Too big" }] };
    expect(await errorCode(fetchDataset(URL_A, { fetchImpl: fakeFetch(413, body) }))).toBe(
      "too_large",
    );
  });

  it("maps a 500 with an HTML body to upstream", async () => {
    const fetchImpl = fakeFetch(500, "<html>Internal error</html>", "text/html");
    expect(await errorCode(fetchDataset(URL_A, { fetchImpl }))).toBe("upstream");
  });

  it("maps an error array inside a 200 response to its own status", async () => {
    const body = { error: [{ status: 404, id: 100, label: "Not found" }] };
    expect(await errorCode(fetchDataset(URL_A, { fetchImpl: fakeFetch(200, body) }))).toBe(
      "not_found",
    );
  });

  it("maps a 200 that is not JSON to malformed", async () => {
    const fetchImpl = fakeFetch(200, "not json", "text/plain");
    expect(await errorCode(fetchDataset(URL_A, { fetchImpl }))).toBe("malformed");
  });

  it("maps a 200 with the wrong shape to malformed", async () => {
    const fetchImpl = fakeFetch(200, readFixture("synthetic/malformed"));
    expect(await errorCode(fetchDataset(URL_A, { fetchImpl }))).toBe("malformed");
  });

  it("maps a timeout to timeout", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new DOMException("The operation timed out.", "TimeoutError");
    });
    expect(await errorCode(fetchDataset(URL_A, { fetchImpl }))).toBe("timeout");
  });

  it("aborts a slow request after the timeout", async () => {
    const fetchImpl = (_url: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
      });
    expect(await errorCode(fetchDataset(URL_A, { fetchImpl, timeoutMs: 20 }))).toBe("timeout");
  });

  it("maps a network failure to network", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    expect(await errorCode(fetchDataset(URL_A, { fetchImpl }))).toBe("network");
  });
});

describe("fetchDatasetQueued", () => {
  it("never runs two Eurostat requests at the same time", async () => {
    let running = 0;
    let maxRunning = 0;
    const body = JSON.stringify(readFixture("unemployment"));
    const fetchImpl = async () => {
      running++;
      maxRunning = Math.max(maxRunning, running);
      await new Promise((r) => setTimeout(r, 10));
      running--;
      return new Response(body, { status: 200 });
    };
    await Promise.all([
      fetchDatasetQueued(`${URL_A}?1`, { fetchImpl }),
      fetchDatasetQueued(`${URL_B}?1`, { fetchImpl }),
      fetchDatasetQueued(`${URL_A}?2`, { fetchImpl }),
    ]);
    expect(maxRunning).toBe(1);
  });

  it("shares one request between identical concurrent calls", async () => {
    const fetchImpl = vi.fn(fakeFetch(200, readFixture("unemployment")));
    const [a, b] = await Promise.all([
      fetchDatasetQueued(`${URL_A}?dedupe`, { fetchImpl }),
      fetchDatasetQueued(`${URL_A}?dedupe`, { fetchImpl }),
    ]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
  });

  it("keeps the queue moving after a failure", async () => {
    await expect(
      fetchDatasetQueued(`${URL_A}?fail`, { fetchImpl: fakeFetch(500, "oops", "text/plain") }),
    ).rejects.toBeInstanceOf(SeriesError);
    const ok = await fetchDatasetQueued(`${URL_A}?after`, {
      fetchImpl: fakeFetch(200, readFixture("unemployment")),
    });
    expect(ok.class).toBe("dataset");
  });
});

describe("error mapping", () => {
  it("maps Eurostat statuses to codes", () => {
    expect(codeForEurostatStatus(400, 100)).toBe("no_data");
    expect(codeForEurostatStatus(400)).toBe("bad_request");
    expect(codeForEurostatStatus(404)).toBe("not_found");
    expect(codeForEurostatStatus(413)).toBe("too_large");
    expect(codeForEurostatStatus(500)).toBe("upstream");
    expect(codeForEurostatStatus(503)).toBe("upstream");
  });

  it("maps codes to our own HTTP statuses", () => {
    expect(httpStatusFor("invalid_indicator")).toBe(400);
    expect(httpStatusFor("no_data")).toBe(404);
    expect(httpStatusFor("timeout")).toBe(504);
    expect(httpStatusFor("upstream")).toBe(502);
  });
});
