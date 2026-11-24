import { readFileSync } from "node:fs";
import { join } from "node:path";

// Vitest runs from the project root; `import.meta.url` is not a file URL under jsdom.
const root = join(process.cwd(), "fixtures/");

/** Reads a saved Eurostat (or synthetic) response from `fixtures/`. */
export function readFixture(name: string): unknown {
  return JSON.parse(readFileSync(`${root}${name}.json`, "utf8"));
}

export const REAL_FIXTURES = [
  "unemployment",
  "gdp-per-capita",
  "renewable-energy",
  "life-expectancy",
  "internet-use",
  "housing-cost",
  "inflation",
  "employment-rate",
] as const;

/** A fake `fetch` that always answers with the given status and body. */
export function fakeFetch(status: number, body: unknown, contentType = "application/json") {
  const text = typeof body === "string" ? body : JSON.stringify(body);
  return async () => new Response(text, { status, headers: { "Content-Type": contentType } });
}
