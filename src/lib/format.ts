import type { UnitKind } from "./indicators";
import { COUNTRIES } from "./countries";

const formatters = new Map<string, Intl.NumberFormat>();

function numberFormat(locale: string, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, options);
    formatters.set(key, formatter);
  }
  return formatter;
}

/** Full value with its unit, e.g. "6.4%", "€38,650", "81.7 years" / "6,4%", "38 650 €", "81,7 anos". */
export function formatValue(
  value: number,
  unit: UnitKind,
  decimals: number,
  locale: string,
): string {
  const digits = { minimumFractionDigits: decimals, maximumFractionDigits: decimals };
  switch (unit) {
    case "percent":
      return numberFormat(locale, { style: "unit", unit: "percent", ...digits }).format(value);
    case "eur":
      return numberFormat(locale, { style: "currency", currency: "EUR", ...digits }).format(value);
    case "years":
      return numberFormat(locale, {
        style: "unit",
        unit: "year",
        unitDisplay: "long",
        ...digits,
      }).format(value);
  }
}

/** Short value for chart axes, e.g. "6%", "€40K" / "40 mil €", "80". */
export function formatAxisValue(value: number, unit: UnitKind, locale: string): string {
  switch (unit) {
    case "percent":
      return numberFormat(locale, {
        style: "unit",
        unit: "percent",
        maximumFractionDigits: 1,
      }).format(value);
    case "eur":
      return numberFormat(locale, {
        style: "currency",
        currency: "EUR",
        notation: "compact",
        maximumFractionDigits: 0,
      }).format(value);
    case "years":
      return numberFormat(locale, { maximumFractionDigits: 0 }).format(value);
  }
}

/** Eurostat sends offsets without a colon ("+0100"); make it valid ISO 8601 first. */
export function parseEurostatDate(value: string): Date | null {
  const normalized = value.replace(/([+-]\d{2})(\d{2})$/, "$1:$2");
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value: string, locale: string): string | null {
  const date = parseEurostatDate(value);
  if (!date) return null;
  return new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "Europe/Brussels" }).format(
    date,
  );
}

const displayNames = new Map<string, Intl.DisplayNames>();

/**
 * Localized country name from the browser's own data (CLDR), so Portuguese
 * names need no hand-written translation. Falls back to Eurostat's English
 * label for any code the runtime does not know.
 */
export function countryName(code: string, locale: string, fallback?: string): string {
  const iso2 = COUNTRIES[code]?.iso2 ?? code;
  let names = displayNames.get(locale);
  if (!names) {
    names = new Intl.DisplayNames([locale], { type: "region", fallback: "none" });
    displayNames.set(locale, names);
  }
  let name: string | undefined;
  try {
    name = names.of(iso2);
  } catch {
    name = undefined;
  }
  name = name || fallback?.replace(/\*$/, "") || code;
  // Eurostat's required footnote marker; the footnote itself is in the footer.
  return code === "XK" ? `${name}*` : name;
}
