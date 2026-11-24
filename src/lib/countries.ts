/**
 * The countries the app shows, keyed by Eurostat geo code.
 *
 * Eurostat mostly uses ISO 3166-1 alpha-2, with a few exceptions: Greece is
 * EL (ISO: GR) and the United Kingdom is UK (ISO: GB). `iso2` is what
 * `Intl.DisplayNames` needs, and `isoNumeric` is what the Natural Earth
 * boundary file uses as feature id.
 *
 * Anything Eurostat returns that is not listed here is dropped: FX
 * (metropolitan France, which duplicates FR) and US (which some datasets add
 * as a benchmark but which isn't part of a European comparison).
 *
 * No imports, so `scripts/build-map.ts` can run it directly with Node.
 */
export interface CountryInfo {
  iso2: string;
  isoNumeric: string | null;
  eu: boolean;
}

export const COUNTRIES: Record<string, CountryInfo> = {
  AT: { iso2: "AT", isoNumeric: "040", eu: true },
  BE: { iso2: "BE", isoNumeric: "056", eu: true },
  BG: { iso2: "BG", isoNumeric: "100", eu: true },
  CY: { iso2: "CY", isoNumeric: "196", eu: true },
  CZ: { iso2: "CZ", isoNumeric: "203", eu: true },
  DE: { iso2: "DE", isoNumeric: "276", eu: true },
  DK: { iso2: "DK", isoNumeric: "208", eu: true },
  EE: { iso2: "EE", isoNumeric: "233", eu: true },
  EL: { iso2: "GR", isoNumeric: "300", eu: true },
  ES: { iso2: "ES", isoNumeric: "724", eu: true },
  FI: { iso2: "FI", isoNumeric: "246", eu: true },
  FR: { iso2: "FR", isoNumeric: "250", eu: true },
  HR: { iso2: "HR", isoNumeric: "191", eu: true },
  HU: { iso2: "HU", isoNumeric: "348", eu: true },
  IE: { iso2: "IE", isoNumeric: "372", eu: true },
  IT: { iso2: "IT", isoNumeric: "380", eu: true },
  LT: { iso2: "LT", isoNumeric: "440", eu: true },
  LU: { iso2: "LU", isoNumeric: "442", eu: true },
  LV: { iso2: "LV", isoNumeric: "428", eu: true },
  MT: { iso2: "MT", isoNumeric: "470", eu: true },
  NL: { iso2: "NL", isoNumeric: "528", eu: true },
  PL: { iso2: "PL", isoNumeric: "616", eu: true },
  PT: { iso2: "PT", isoNumeric: "620", eu: true },
  RO: { iso2: "RO", isoNumeric: "642", eu: true },
  SE: { iso2: "SE", isoNumeric: "752", eu: true },
  SI: { iso2: "SI", isoNumeric: "705", eu: true },
  SK: { iso2: "SK", isoNumeric: "703", eu: true },
  // EFTA
  CH: { iso2: "CH", isoNumeric: "756", eu: false },
  IS: { iso2: "IS", isoNumeric: "352", eu: false },
  LI: { iso2: "LI", isoNumeric: "438", eu: false },
  NO: { iso2: "NO", isoNumeric: "578", eu: false },
  // Candidate and potential candidate countries, and other neighbours
  AL: { iso2: "AL", isoNumeric: "008", eu: false },
  AM: { iso2: "AM", isoNumeric: "051", eu: false },
  AZ: { iso2: "AZ", isoNumeric: "031", eu: false },
  BA: { iso2: "BA", isoNumeric: "070", eu: false },
  BY: { iso2: "BY", isoNumeric: "112", eu: false },
  GE: { iso2: "GE", isoNumeric: "268", eu: false },
  MD: { iso2: "MD", isoNumeric: "498", eu: false },
  ME: { iso2: "ME", isoNumeric: "499", eu: false },
  MK: { iso2: "MK", isoNumeric: "807", eu: false },
  RS: { iso2: "RS", isoNumeric: "688", eu: false },
  RU: { iso2: "RU", isoNumeric: "643", eu: false },
  SM: { iso2: "SM", isoNumeric: "674", eu: false },
  TR: { iso2: "TR", isoNumeric: "792", eu: false },
  UA: { iso2: "UA", isoNumeric: "804", eu: false },
  UK: { iso2: "GB", isoNumeric: "826", eu: false },
  // Kosovo has no ISO numeric code; the boundary file identifies it by name.
  XK: { iso2: "XK", isoNumeric: null, eu: false },
};

export function isKnownCountry(code: string): boolean {
  return Object.hasOwn(COUNTRIES, code);
}
