/**
 * The curated indicator catalog: the single source of truth for which
 * Eurostat datasets the app shows and how each one is filtered down to
 * exactly one series per country.
 *
 * Every dimension other than `geo` and `time` is pinned to a single value, so
 * a response has at most (countries × years) cells, around 1,000, far below
 * Eurostat's 500,000-cell synchronous limit.
 *
 * This file has no imports so that `scripts/fetch-fixtures.ts` can run it
 * directly with Node's type stripping.
 */

export type UnitKind = "percent" | "eur" | "years";

export interface Indicator {
  /** Stable id used in URLs and translation keys. */
  id: string;
  /** Eurostat dataset code (lower case, as in the Data Browser). */
  dataset: string;
  /** Pins every non-geo, non-time dimension to one value. */
  filters: Record<string, string>;
  unit: UnitKind;
  /** Decimals to show when formatting values. */
  decimals: number;
}

export const INDICATORS = [
  {
    id: "unemployment",
    dataset: "une_rt_a",
    filters: { freq: "A", age: "Y15-74", sex: "T", unit: "PC_ACT" },
    unit: "percent",
    decimals: 1,
  },
  {
    id: "gdp-per-capita",
    dataset: "nama_10_pc",
    filters: { freq: "A", na_item: "B1GQ", unit: "CP_EUR_HAB" },
    unit: "eur",
    decimals: 0,
  },
  {
    id: "renewable-energy",
    dataset: "nrg_ind_ren",
    filters: { freq: "A", nrg_bal: "REN", unit: "PC" },
    unit: "percent",
    decimals: 1,
  },
  {
    id: "life-expectancy",
    dataset: "demo_mlexpec",
    filters: { freq: "A", sex: "T", age: "Y_LT1", unit: "YR" },
    unit: "years",
    decimals: 1,
  },
  {
    id: "internet-use",
    dataset: "isoc_ci_ifp_iu",
    filters: {
      freq: "A",
      indic_is: "I_IU3",
      unit: "PC_IND",
      ind_type: "IND_TOTAL",
    },
    unit: "percent",
    decimals: 0,
  },
  {
    id: "housing-cost",
    dataset: "ilc_lvho07a",
    filters: { freq: "A", unit: "PC", rskpovth: "TOTAL", age: "TOTAL", sex: "T" },
    unit: "percent",
    decimals: 1,
  },
  {
    // prc_hicp_aind was discontinued in 2026 and replaced by this ECOICOP v2 dataset.
    id: "inflation",
    dataset: "prc_hicp_ainr",
    filters: { freq: "A", coicop18: "TOTAL", unit: "RCH_A_AVG" },
    unit: "percent",
    decimals: 1,
  },
  {
    id: "employment-rate",
    dataset: "lfsi_emp_a",
    filters: {
      freq: "A",
      indic_em: "EMP_LFS",
      sex: "T",
      age: "Y20-64",
      unit: "PC_POP",
    },
    unit: "percent",
    decimals: 1,
  },
] as const satisfies readonly Indicator[];

export type IndicatorId = (typeof INDICATORS)[number]["id"];

export const INDICATOR_IDS = INDICATORS.map((i) => i.id) as IndicatorId[];

export const DEFAULT_INDICATOR: IndicatorId = "unemployment";

/** First year requested from Eurostat. Keeps responses small and charts readable. */
export const SINCE_YEAR = 2000;

export function isIndicatorId(value: unknown): value is IndicatorId {
  return typeof value === "string" && (INDICATOR_IDS as string[]).includes(value);
}

export function getIndicator(id: IndicatorId): Indicator {
  const found = INDICATORS.find((i) => i.id === id);
  if (!found) throw new Error(`Unknown indicator: ${id}`);
  return found;
}

export const EUROSTAT_BASE = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data";

/**
 * Builds the Eurostat Statistics API URL for one indicator.
 *
 * `geoLevel=country` returns countries only (no regions or EU aggregates). It
 * cannot be combined with `geo`, so country selection happens in the app,
 * not in the request.
 */
export function buildEurostatUrl(indicator: Indicator): string {
  const params = new URLSearchParams({ format: "JSON", lang: "EN" });
  for (const [dimension, value] of Object.entries(indicator.filters)) {
    params.append(dimension, value);
  }
  params.append("geoLevel", "country");
  params.append("sinceTimePeriod", String(SINCE_YEAR));
  return `${EUROSTAT_BASE}/${indicator.dataset}?${params.toString()}`;
}
