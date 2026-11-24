import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { INDICATORS } from "../indicators";

/**
 * A `fetch` that answers Eurostat URLs from the saved responses in
 * `fixtures/`. Enabled with EUROSTAT_FIXTURES=1, so end-to-end tests and CI
 * are deterministic and never send traffic to Eurostat. Everything after the
 * fetch (validation, parsing, caching, the route) is the real code.
 */
export const fixtureFetch: typeof fetch = async (input) => {
  const url = new URL(String(input));
  const dataset = url.pathname.split("/").pop();
  const indicator = INDICATORS.find((i) => i.dataset === dataset);
  if (!indicator) {
    return Response.json(
      { error: [{ status: 404, id: 100, label: "Not in fixtures" }] },
      { status: 404 },
    );
  }
  const body = await readFile(join(process.cwd(), "fixtures", `${indicator.id}.json`), "utf8");
  return new Response(body, { status: 200, headers: { "Content-Type": "application/json" } });
};
