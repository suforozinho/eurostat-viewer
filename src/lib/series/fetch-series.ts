import type { IndicatorId } from "../indicators";
import type { SeriesErrorCode } from "../eurostat/errors";
import { SERIES_ERROR_CODES } from "../eurostat/errors";
import type { SeriesPayload } from "./schema";

/** Browser-side error carrying the same codes as the API, for translated messages. */
export class SeriesFetchError extends Error {
  constructor(readonly code: SeriesErrorCode) {
    super(code);
    this.name = "SeriesFetchError";
  }
}

const RETRYABLE: SeriesErrorCode[] = ["upstream", "timeout", "network"];

export function isRetryable(error: unknown): boolean {
  return error instanceof SeriesFetchError && RETRYABLE.includes(error.code);
}

/**
 * The server validates every payload with the full Zod schema before sending
 * it (see load.ts). The browser only checks the shape it relies on, which
 * keeps Zod (about 30 KB gzipped) out of the page's JavaScript.
 */
export function isSeriesPayload(value: unknown): value is SeriesPayload {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.indicator === "string" &&
    typeof v.dataset === "string" &&
    Array.isArray(v.years) &&
    v.years.every((y) => Number.isInteger(y)) &&
    Array.isArray(v.countries) &&
    Array.isArray(v.observations) &&
    v.observations.every(
      (o: Record<string, unknown>) =>
        typeof o?.country === "string" &&
        Number.isInteger(o.year) &&
        typeof o.value === "number" &&
        Number.isFinite(o.value),
    )
  );
}

function errorCodeOf(body: unknown): SeriesErrorCode | null {
  const code = (body as { error?: { code?: unknown } } | null)?.error?.code;
  return SERIES_ERROR_CODES.includes(code as SeriesErrorCode) ? (code as SeriesErrorCode) : null;
}

/** Calls our own `/api/series` route and validates what comes back. */
export async function fetchSeries(
  indicator: IndicatorId,
  signal?: AbortSignal,
): Promise<SeriesPayload> {
  let res: Response;
  try {
    res = await fetch(`/api/series?indicator=${encodeURIComponent(indicator)}`, { signal });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new SeriesFetchError("network");
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    if (res.ok) throw new SeriesFetchError("malformed");
    throw new SeriesFetchError(res.status === 504 ? "timeout" : "upstream");
  }

  if (!res.ok) {
    throw new SeriesFetchError(errorCodeOf(body) ?? "upstream");
  }

  if (!isSeriesPayload(body)) throw new SeriesFetchError("malformed");
  return body;
}
