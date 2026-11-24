import { z } from "zod";
import { INDICATORS, type IndicatorId } from "../indicators";
import { SERIES_ERROR_CODES } from "../eurostat/errors";

/**
 * The clean shape our `/api/series` route returns. The browser validates
 * every response against this schema too, so if the API ever drifts the UI
 * shows a clear error instead of a broken chart.
 */

const indicatorIds = INDICATORS.map((i) => i.id) as [IndicatorId, ...IndicatorId[]];

export const ObservationSchema = z.object({
  country: z.string().min(1),
  year: z.number().int(),
  value: z.number(),
  flag: z.string().nullable(),
});

export const SeriesPayloadSchema = z.object({
  indicator: z.enum(indicatorIds),
  dataset: z.string(),
  /** Eurostat's English title for the dataset, shown as-is in every language. */
  datasetLabel: z.string(),
  /** Eurostat's English label for the unit of measure. */
  unitLabel: z.string(),
  /** When Eurostat last updated the data (ISO 8601), if known. */
  updated: z.string().nullable(),
  /** Link to the dataset in Eurostat's Data Browser. */
  sourceUrl: z.url(),
  countries: z.array(z.object({ code: z.string(), name: z.string() })),
  years: z.array(z.number().int()),
  observations: z.array(ObservationSchema),
});

export type SeriesPayload = z.infer<typeof SeriesPayloadSchema>;
export type ObservationRow = z.infer<typeof ObservationSchema>;

export const SeriesErrorBodySchema = z.object({
  error: z.object({ code: z.enum(SERIES_ERROR_CODES) }),
});
