import { buildEurostatUrl, getIndicator, type IndicatorId } from "../indicators";
import { isKnownCountry } from "../countries";
import { fetchDatasetQueued, type FetchOptions } from "../eurostat/client";
import { SeriesError } from "../eurostat/errors";
import { JsonStatParseError, parseJsonStat } from "../jsonstat/parse";
import { SeriesPayloadSchema, type SeriesPayload } from "./schema";

export function dataBrowserUrl(dataset: string): string {
  return `https://ec.europa.eu/eurostat/databrowser/view/${dataset}/default/table?lang=en`;
}

/**
 * Fetches, validates and reshapes one indicator. Framework-free so it can be
 * unit tested with a fake `fetch`; caching lives in `get-series.ts`.
 */
export async function loadSeries(id: IndicatorId, options?: FetchOptions): Promise<SeriesPayload> {
  const indicator = getIndicator(id);
  const dataset = await fetchDatasetQueued(buildEurostatUrl(indicator), options);

  let parsed;
  try {
    parsed = parseJsonStat(dataset);
  } catch (error) {
    if (error instanceof JsonStatParseError) throw new SeriesError("malformed", error.message);
    throw error;
  }

  // Keep only the European countries the app knows (drops FX, US, …).
  const observations = parsed.observations.filter((o) => isKnownCountry(o.country));
  if (observations.length === 0) {
    throw new SeriesError("no_data", `Eurostat returned no values for ${indicator.dataset}`);
  }
  const years = [...new Set(observations.map((o) => o.year))].sort((a, b) => a - b);

  return SeriesPayloadSchema.parse({
    indicator: id,
    dataset: indicator.dataset,
    datasetLabel: parsed.label,
    unitLabel: parsed.fixedLabels.unit ?? "",
    updated: parsed.updated,
    sourceUrl: dataBrowserUrl(indicator.dataset),
    countries: parsed.countries.filter((c) => isKnownCountry(c.code)),
    years,
    observations,
  });
}
