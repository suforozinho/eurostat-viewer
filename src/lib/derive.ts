import type { ObservationRow, SeriesPayload } from "./series/schema";

/** Default trend window: the last 15 years of data. */
export const DEFAULT_TREND_YEARS = 15;

/** A year counts as "well covered" if it has at least this share of the best year's countries. */
const COVERAGE_THRESHOLD = 0.8;

export type TrendRow = { year: number } & Record<string, number | null>;

export interface RankingRow {
  code: string;
  value: number;
  flag: string | null;
}

export function observationKey(country: string, year: number) {
  return `${country}|${year}`;
}

export function indexObservations(payload: SeriesPayload): Map<string, ObservationRow> {
  return new Map(payload.observations.map((o) => [observationKey(o.country, o.year), o]));
}

/**
 * The most recent year that most countries have reported. The very latest
 * year is often published for only a handful of countries, which would make
 * a sparse, misleading default for the ranking and the map.
 */
export function latestWellCoveredYear(payload: SeriesPayload): number {
  const counts = new Map<number, number>();
  for (const o of payload.observations) counts.set(o.year, (counts.get(o.year) ?? 0) + 1);
  const best = Math.max(...counts.values());
  for (let i = payload.years.length - 1; i >= 0; i--) {
    const year = payload.years[i];
    if ((counts.get(year) ?? 0) >= best * COVERAGE_THRESHOLD) return year;
  }
  return payload.years[payload.years.length - 1];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/** Turns the URL's optional years into concrete ones that exist in this dataset. */
export function resolveYears(
  payload: SeriesPayload,
  requested: { from: number | null; to: number | null; year: number | null },
) {
  const first = payload.years[0];
  const last = payload.years[payload.years.length - 1];
  const to = clamp(requested.to ?? last, first, last);
  const from = clamp(requested.from ?? to - (DEFAULT_TREND_YEARS - 1), first, to);
  const year =
    requested.year !== null && payload.years.includes(requested.year)
      ? requested.year
      : latestWellCoveredYear(payload);
  return { from, to, year };
}

/** One row per year with a column per country; missing values are null so lines show gaps. */
export function trendRows(
  payload: SeriesPayload,
  countries: string[],
  from: number,
  to: number,
): TrendRow[] {
  const index = indexObservations(payload);
  const rows: TrendRow[] = [];
  for (let year = from; year <= to; year++) {
    const row = { year } as TrendRow;
    for (const c of countries) row[c] = index.get(observationKey(c, year))?.value ?? null;
    rows.push(row);
  }
  return rows;
}

export function countriesWithData(rows: TrendRow[], countries: string[]): string[] {
  return countries.filter((c) => rows.some((r) => r[c] !== null));
}

/** All countries with a value in `year`, highest first; ties broken by code for stable order. */
export function rankingRows(payload: SeriesPayload, year: number): RankingRow[] {
  return payload.observations
    .filter((o) => o.year === year)
    .map(({ country, value, flag }) => ({ code: country, value, flag }))
    .sort((a, b) => b.value - a.value || a.code.localeCompare(b.code));
}

/** Gives each country a palette slot that it keeps while it stays selected. */
export function assignSlots(
  previous: Record<string, number>,
  countries: string[],
  slotCount: number,
): Record<string, number> {
  const next: Record<string, number> = {};
  for (const c of countries) if (c in previous) next[c] = previous[c];
  const used = new Set(Object.values(next));
  for (const c of countries) {
    if (c in next) continue;
    let slot = 0;
    while (used.has(slot) && slot < slotCount - 1) slot++;
    next[c] = slot;
    used.add(slot);
  }
  return next;
}
