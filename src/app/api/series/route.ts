import type { NextRequest } from "next/server";
import { isIndicatorId } from "@/lib/indicators";
import { httpStatusFor } from "@/lib/eurostat/errors";
import { getSeries } from "@/lib/series/get-series";

/** Room for a slow first Eurostat request after a data release (see client.ts). */
export const maxDuration = 60;

/**
 * GET /api/series?indicator=unemployment
 *
 * Returns every country and year for one curated indicator, in a small clean
 * shape (see `SeriesPayloadSchema`). Only ids from the catalog are accepted,
 * so this cannot be used as an open proxy to Eurostat.
 */
export async function GET(request: NextRequest) {
  const indicator = request.nextUrl.searchParams.get("indicator");
  if (!isIndicatorId(indicator)) {
    return Response.json({ error: { code: "invalid_indicator" } }, { status: 400 });
  }

  const result = await getSeries(indicator);

  if (!result.ok) {
    return Response.json(
      { error: { code: result.code } },
      {
        status: httpStatusFor(result.code),
        headers: { "Cache-Control": "public, s-maxage=60" },
      },
    );
  }

  return Response.json(result.data, {
    headers: {
      // Browsers keep it for an hour; a CDN keeps it for 6 hours and may serve
      // it stale for another 6 while it refetches in the background.
      "Cache-Control": "public, max-age=3600, s-maxage=21600, stale-while-revalidate=21600",
    },
  });
}
