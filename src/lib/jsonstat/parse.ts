import type { JsonStatDataset } from "./schema";

/** One data point: the value for one country in one year. */
export interface Observation {
  country: string;
  year: number;
  value: number;
  /** Eurostat status flag, e.g. "p" (provisional), "e" (estimated), "b" (break in series). */
  flag: string | null;
}

export interface ParsedSeries {
  /** Eurostat's English dataset title. */
  label: string;
  /** ISO timestamp of the last data update, if Eurostat sent one. */
  updated: string | null;
  /** English labels of the pinned (size 1) dimensions, keyed by dimension id. */
  fixedLabels: Record<string, string>;
  /** Countries that have at least one value, in Eurostat's order. */
  countries: { code: string; name: string }[];
  /** Years that have at least one value, ascending. */
  years: number[];
  observations: Observation[];
}

export class JsonStatParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JsonStatParseError";
  }
}

interface ParseOptions {
  geoDimension?: string;
  timeDimension?: string;
}

/** Returns the category codes of a dimension, ordered by position. */
function orderedCodes(dataset: JsonStatDataset, dim: string): string[] {
  const index = dataset.dimension[dim].category.index;
  if (Array.isArray(index)) return index;
  const codes: string[] = [];
  for (const [code, position] of Object.entries(index)) codes[position] = code;
  return codes;
}

/**
 * Row-major strides: the last dimension changes fastest. The flat position of
 * a cell is the sum of (position in each dimension × stride of that dimension).
 */
export function computeStrides(size: readonly number[]): number[] {
  const strides = new Array<number>(size.length);
  let stride = 1;
  for (let k = size.length - 1; k >= 0; k--) {
    strides[k] = stride;
    stride *= size[k];
  }
  return strides;
}

function readValue(dataset: JsonStatDataset, flat: number): number | null {
  const { value } = dataset;
  const raw = Array.isArray(value) ? value[flat] : value[String(flat)];
  return typeof raw === "number" && Number.isFinite(raw) ? raw : null;
}

function readStatus(dataset: JsonStatDataset, flat: number): string | null {
  const { status } = dataset;
  if (status === undefined) return null;
  if (typeof status === "string") return status || null;
  const raw = Array.isArray(status) ? status[flat] : status[String(flat)];
  return raw ? raw : null;
}

/**
 * Turns a JSON-stat dataset into flat `{ country, year, value }` rows.
 *
 * The dataset must have a geo and a time dimension. Every other dimension
 * must have size 1 (the request pins it with a filter); otherwise one country
 * and year could map to several values and the result would be ambiguous.
 *
 * Missing values (absent keys, `null`) are skipped, so a country with a gap in
 * a year simply has no row for it. A dataset with a zero-sized dimension,
 * which is how Eurostat answers a query with no results, parses to zero rows.
 */
export function parseJsonStat(
  dataset: JsonStatDataset,
  { geoDimension = "geo", timeDimension = "time" }: ParseOptions = {},
): ParsedSeries {
  const { id, size } = dataset;
  const geoAxis = id.indexOf(geoDimension);
  const timeAxis = id.indexOf(timeDimension);
  if (geoAxis === -1) throw new JsonStatParseError(`missing "${geoDimension}" dimension`);
  if (timeAxis === -1) throw new JsonStatParseError(`missing "${timeDimension}" dimension`);

  const fixedLabels: Record<string, string> = {};
  // A zero-sized dimension means no cells at all. Check it first: an empty
  // answer is "no data", even if other dimensions were left unfiltered.
  const isEmpty = size.some((n) => n === 0);
  for (let k = 0; k < id.length; k++) {
    if (k === geoAxis || k === timeAxis) continue;
    if (size[k] > 1 && !isEmpty) {
      throw new JsonStatParseError(`dimension "${id[k]}" has ${size[k]} values; filter it to one`);
    }
    const [code] = orderedCodes(dataset, id[k]);
    if (code !== undefined) {
      fixedLabels[id[k]] = dataset.dimension[id[k]].category.label?.[code] ?? code;
    }
  }

  const result: ParsedSeries = {
    label: dataset.label ?? "",
    updated: dataset.updated ?? null,
    fixedLabels,
    countries: [],
    years: [],
    observations: [],
  };
  if (isEmpty) return result;

  const strides = computeStrides(size);
  const geoCodes = orderedCodes(dataset, geoDimension);
  const timeCodes = orderedCodes(dataset, timeDimension);
  const geoLabels = dataset.dimension[geoDimension].category.label ?? {};

  const years = timeCodes.map((code) => {
    if (!/^\d{4}$/.test(code)) {
      throw new JsonStatParseError(`time code "${code}" is not an annual period`);
    }
    return Number(code);
  });

  const countriesWithData = new Set<string>();
  const yearsWithData = new Set<number>();

  for (let g = 0; g < geoCodes.length; g++) {
    for (let t = 0; t < timeCodes.length; t++) {
      // Fixed dimensions are all at position 0, so they add nothing.
      const flat = g * strides[geoAxis] + t * strides[timeAxis];
      const value = readValue(dataset, flat);
      if (value === null) continue;
      result.observations.push({
        country: geoCodes[g],
        year: years[t],
        value,
        flag: readStatus(dataset, flat),
      });
      countriesWithData.add(geoCodes[g]);
      yearsWithData.add(years[t]);
    }
  }

  result.countries = geoCodes
    .filter((code) => countriesWithData.has(code))
    .map((code) => ({ code, name: geoLabels[code] ?? code }));
  result.years = [...yearsWithData].sort((a, b) => a - b);
  return result;
}
