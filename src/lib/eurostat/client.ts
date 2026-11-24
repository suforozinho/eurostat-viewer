import { z } from "zod";
import {
  EurostatErrorBodySchema,
  JsonStatDatasetSchema,
  type JsonStatDataset,
} from "../jsonstat/schema";
import { SeriesError, codeForEurostatStatus } from "./errors";

export interface FetchOptions {
  /** Injected in tests; defaults to the global `fetch`. */
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * Fetches one Eurostat dataset and validates it as JSON-stat.
 * Every failure is converted to a `SeriesError` with a stable code.
 */
export async function fetchDataset(
  url: string,
  { fetchImpl = fetch, timeoutMs = DEFAULT_TIMEOUT_MS }: FetchOptions = {},
): Promise<JsonStatDataset> {
  let res: Response;
  try {
    res = await fetchImpl(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    if (name === "TimeoutError" || name === "AbortError") {
      throw new SeriesError("timeout", `Eurostat did not answer within ${timeoutMs} ms`);
    }
    throw new SeriesError("network", `Could not reach Eurostat: ${String(error)}`);
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    if (!res.ok)
      throw new SeriesError(codeForEurostatStatus(res.status), `Eurostat answered ${res.status}`);
    throw new SeriesError("malformed", "Eurostat response was not valid JSON");
  }

  // Eurostat reports errors as `{ error: [{ status, id, label }] }`.
  const errorBody = EurostatErrorBodySchema.safeParse(body);
  if (!res.ok || errorBody.success) {
    const first = errorBody.success ? errorBody.data.error[0] : undefined;
    const status = res.ok ? (first?.status ?? 500) : res.status;
    throw new SeriesError(
      codeForEurostatStatus(status, first?.id),
      `Eurostat answered ${status}${first?.label ? `: ${first.label}` : ""}`,
    );
  }

  const parsed = JsonStatDatasetSchema.safeParse(body);
  if (!parsed.success) {
    throw new SeriesError(
      "malformed",
      `Unexpected JSON-stat shape:\n${z.prettifyError(parsed.error)}`,
    );
  }
  return parsed.data;
}

/*
 * Eurostat asks automated clients to send one extraction request at a time.
 * All server-side calls go through this queue, and identical requests that
 * are already waiting or running share a single promise.
 */
let queueTail: Promise<unknown> = Promise.resolve();
const inFlight = new Map<string, Promise<JsonStatDataset>>();

export function fetchDatasetQueued(url: string, options?: FetchOptions): Promise<JsonStatDataset> {
  const existing = inFlight.get(url);
  if (existing) return existing;

  const run = queueTail.then(() => fetchDataset(url, options));
  queueTail = run.catch(() => undefined);
  inFlight.set(url, run);
  run.then(
    () => inFlight.delete(url),
    () => inFlight.delete(url),
  );
  return run;
}
