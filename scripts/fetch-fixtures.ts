/**
 * Refreshes the raw Eurostat responses in `fixtures/` that the parser tests
 * run against. Uses the exact same URLs as production.
 *
 * Eurostat asks scripts to send one request at a time, so requests run
 * sequentially with a short pause between them.
 *
 * Run with: npm run fixtures
 */
import { writeFile, mkdir } from "node:fs/promises";
import { INDICATORS, buildEurostatUrl, EUROSTAT_BASE } from "../src/lib/indicators.ts";

const OUT = new URL("../fixtures/", import.meta.url);
const PAUSE_MS = 1500;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function save(name: string, url: string) {
  const res = await fetch(url);
  const body = await res.text();
  await writeFile(new URL(`${name}.json`, OUT), body);
  console.log(`${res.status}  ${name}.json  (${body.length} bytes)`);
  await sleep(PAUSE_MS);
}

await mkdir(OUT, { recursive: true });

for (const indicator of INDICATORS) {
  await save(indicator.id, buildEurostatUrl(indicator));
}

// Error and edge cases, captured from the live API so tests reflect reality.
// A time period with no data: Eurostat answers 200 with an empty dataset.
await save(
  "error-no-results",
  `${EUROSTAT_BASE}/une_rt_a?format=JSON&lang=EN&geo=PT&time=1800&unit=PC_ACT&age=Y15-74&sex=T`,
);
// Invalid filter values: also a 200 with zero-sized dimensions.
await save("error-invalid", `${EUROSTAT_BASE}/une_rt_a?format=JSON&lang=EN&geo=XX&unit=NOPE`);
// Unknown dataset: a real 404 with an `error` array.
await save("error-404", `${EUROSTAT_BASE}/not_a_dataset?format=JSON&lang=EN`);
