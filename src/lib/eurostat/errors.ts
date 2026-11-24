/**
 * Every way loading a series can fail, as a small closed set of codes. The
 * route handler sends the code to the browser, and the UI turns it into a
 * translated, human message. Raw Eurostat messages never reach users.
 */
export const SERIES_ERROR_CODES = [
  "invalid_indicator", // our API was called with an unknown indicator id
  "no_data", // Eurostat answered, but with no values (or 400 with error id 100)
  "bad_request", // Eurostat 400: syntax or invalid filter values (ids 140, 150)
  "not_found", // Eurostat 404: dataset is gone or renamed
  "too_large", // Eurostat 413: query over 5,000,000 cells (should never happen here)
  "upstream", // Eurostat 5xx or any other unexpected status
  "timeout", // Eurostat did not answer in time
  "network", // could not reach Eurostat at all
  "malformed", // response did not match the JSON-stat schema
] as const;

export type SeriesErrorCode = (typeof SERIES_ERROR_CODES)[number];

export class SeriesError extends Error {
  constructor(
    readonly code: SeriesErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "SeriesError";
  }
}

/** HTTP status our own API answers with for each error code. */
export function httpStatusFor(code: SeriesErrorCode): number {
  switch (code) {
    case "invalid_indicator":
      return 400;
    case "no_data":
    case "not_found":
      return 404;
    case "timeout":
      return 504;
    default:
      return 502;
  }
}

/** Maps a non-OK Eurostat HTTP status (and its error id, when present) to a code. */
export function codeForEurostatStatus(status: number, errorId?: number): SeriesErrorCode {
  if (status === 400) return errorId === 100 ? "no_data" : "bad_request";
  if (status === 404) return "not_found";
  if (status === 413) return "too_large";
  return "upstream";
}
