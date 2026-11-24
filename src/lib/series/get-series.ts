import "server-only";
import { cacheLife } from "next/cache";
import type { IndicatorId } from "../indicators";
import { SeriesError, type SeriesErrorCode } from "../eurostat/errors";
import { fixtureFetch } from "../eurostat/fixture-fetch";
import { loadSeries } from "./load";
import type { SeriesPayload } from "./schema";

export type SeriesResult = { ok: true; data: SeriesPayload } | { ok: false; code: SeriesErrorCode };

const HOUR = 60 * 60;

/**
 * Cached entry point used by the route handler.
 *
 * Eurostat refreshes datasets twice a day (11:00 and 23:00 CET), so a good
 * answer is served from cache for 6 hours, then refreshed in the background,
 * and never served if it is more than 12 hours old.
 *
 * Failures are returned as values rather than thrown so they can be cached
 * too, but only for a minute or so. That protects Eurostat from a burst of
 * retries when it is down, without pinning a temporary error for hours.
 */
export async function getSeries(id: IndicatorId): Promise<SeriesResult> {
  "use cache";
  try {
    const options = process.env.EUROSTAT_FIXTURES === "1" ? { fetchImpl: fixtureFetch } : undefined;
    const data = await loadSeries(id, options);
    cacheLife({ stale: HOUR, revalidate: 6 * HOUR, expire: 12 * HOUR });
    return { ok: true, data };
  } catch (error) {
    cacheLife({ stale: 30, revalidate: 60, expire: 5 * 60 });
    if (error instanceof SeriesError) {
      console.warn(`[series] ${id}: ${error.code}: ${error.message}`);
      return { ok: false, code: error.code };
    }
    console.error(`[series] ${id}: unexpected error`, error);
    return { ok: false, code: "upstream" };
  }
}
