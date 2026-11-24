import { DEFAULT_INDICATOR, isIndicatorId, type IndicatorId } from "./indicators";

/**
 * Everything that defines a view lives in the URL, so any view can be shared,
 * bookmarked and restored with the back button. The language is the path
 * prefix (/en, /pt); the rest is the query string:
 *
 *   /pt?indicator=unemployment&countries=PT,ES,DE&from=2010&to=2025&view=trend
 *
 * Parsing never throws: anything unknown or out of range falls back to a
 * default, so a hand-edited or outdated link still opens a working page.
 */

export const VIEWS = ["trend", "ranking", "map"] as const;
export type View = (typeof VIEWS)[number];

export const DISPLAYS = ["chart", "table"] as const;
export type Display = (typeof DISPLAYS)[number];

export const MAX_COUNTRIES = 5;
export const DEFAULT_COUNTRIES = ["PT", "ES", "DE"];

export interface ExplorerState {
  indicator: IndicatorId;
  countries: string[];
  /** First year of the trend chart; null means "pick from the data". */
  from: number | null;
  /** Last year of the trend chart; null means "latest available". */
  to: number | null;
  /** Year for ranking and map; null means "latest year with good coverage". */
  year: number | null;
  view: View;
  display: Display;
}

interface ReadableParams {
  get(name: string): string | null;
}

function parseYear(raw: string | null): number | null {
  if (!raw || !/^\d{4}$/.test(raw)) return null;
  const year = Number(raw);
  return year >= 1950 && year <= 2100 ? year : null;
}

function parseCountries(raw: string | null): string[] {
  // Absent means "use the defaults"; present but empty means "none selected".
  if (raw === null) return [...DEFAULT_COUNTRIES];
  const codes = raw
    .split(",")
    .map((c) => c.trim().toUpperCase())
    .filter((c) => /^[A-Z]{2}$/.test(c));
  return [...new Set(codes)].slice(0, MAX_COUNTRIES);
}

function oneOf<T extends string>(options: readonly T[], raw: string | null, fallback: T): T {
  return options.includes(raw as T) ? (raw as T) : fallback;
}

export function parseState(params: ReadableParams): ExplorerState {
  const indicator = params.get("indicator");
  let from = parseYear(params.get("from"));
  let to = parseYear(params.get("to"));
  if (from !== null && to !== null && from > to) [from, to] = [to, from];
  return {
    indicator: isIndicatorId(indicator) ? indicator : DEFAULT_INDICATOR,
    countries: parseCountries(params.get("countries")),
    from,
    to,
    year: parseYear(params.get("year")),
    view: oneOf(VIEWS, params.get("view"), "trend"),
    display: oneOf(DISPLAYS, params.get("display"), "chart"),
  };
}

/** Builds the query string. Keys always appear in the same order, so equal views give equal URLs. */
export function serializeState(state: ExplorerState): string {
  const params = new URLSearchParams();
  params.set("indicator", state.indicator);
  params.set("countries", state.countries.join(","));
  if (state.from !== null) params.set("from", String(state.from));
  if (state.to !== null) params.set("to", String(state.to));
  if (state.year !== null) params.set("year", String(state.year));
  if (state.view !== "trend") params.set("view", state.view);
  if (state.display !== "chart") params.set("display", state.display);
  return toQueryString(params);
}

/** Like `params.toString()`, but keeps commas readable (countries=PT,ES rather than PT%2CES). */
export function toQueryString(params: { toString(): string }): string {
  return params.toString().replace(/%2C/gi, ",");
}
