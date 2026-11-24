/**
 * Builds the choropleth's geometry once, at build time, instead of in the
 * browser.
 *
 * Input: Natural Earth 1:50m country boundaries (public domain), via the
 * `world-atlas` package (ISC licence).
 * Output: `src/components/map/europe-paths.json`, SVG path strings already
 * projected and clipped to the map frame.
 *
 * The projection is the Lambert azimuthal equal-area centred on 10°E 52°N,
 * the same as ETRS89-LAEA (EPSG:3035), the projection Eurostat and the EEA use
 * for statistical maps of Europe. Equal-area matters for a choropleth: big
 * countries are not visually inflated.
 *
 * Shipping ready-made paths means the browser downloads no d3-geo, no
 * topojson decoder and no raw coordinates, just the strings it draws.
 *
 * Run with: npm run build:map
 */
import { readFile, writeFile } from "node:fs/promises";
import { geoAzimuthalEqualArea, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { Feature, Geometry } from "geojson";
import { COUNTRIES } from "../src/lib/countries.ts";

const WIDTH = 800;
const HEIGHT = 680;
/** Countries smaller than this (in px²) also get a dot so they can be seen. */
const SMALL_AREA = 60;

const topology = JSON.parse(
  await readFile(
    new URL("../node_modules/world-atlas/countries-50m.json", import.meta.url),
    "utf8",
  ),
) as Topology<{ countries: GeometryCollection<{ name: string }> }>;

const world = feature(topology, topology.objects.countries);

// Frame: from Iceland and Portugal in the west to Türkiye and the Caucasus in
// the east, from Cyprus in the south to the North Cape. The edges are densified
// so the projected frame follows parallels, not great circles.
const frame: [number, number][] = [];
for (let lon = -24; lon <= 45; lon += 1) frame.push([lon, 34.5], [lon, 71.2]);
for (let lat = 34.5; lat <= 71.2; lat += 1) frame.push([-24, lat], [45, lat]);

const projection = geoAzimuthalEqualArea()
  .rotate([-10, -52])
  .fitExtent(
    [
      [8, 8],
      [WIDTH - 8, HEIGHT - 8],
    ],
    { type: "MultiPoint", coordinates: frame },
  )
  .clipExtent([
    [0, 0],
    [WIDTH, HEIGHT],
  ]);

const path = geoPath(projection).digits(1);

const byNumeric = new Map(
  Object.entries(COUNTRIES)
    .filter(([, info]) => info.isoNumeric)
    .map(([code, info]) => [info.isoNumeric!, code]),
);

function eurostatCode(f: Feature<Geometry, { name: string }>): string | null {
  if (f.properties.name === "Kosovo") return "XK";
  return byNumeric.get(String(f.id)) ?? null;
}

interface MapFeature {
  /** Eurostat code, or null for a neighbouring country drawn only for context. */
  code: string | null;
  d: string;
  /** Centre point for a visible dot on very small countries. */
  dot?: [number, number];
}

const features: MapFeature[] = [];
const found = new Set<string>();

for (const f of world.features) {
  const d = path(f);
  if (!d) continue;
  const code = eurostatCode(f);
  const item: MapFeature = { code, d };
  if (code) {
    found.add(code);
    if (path.area(f) < SMALL_AREA) {
      const [x, y] = path.centroid(f);
      item.dot = [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
    }
  }
  features.push(item);
}

// Draw context countries first so data countries' outlines sit on top.
features.sort((a, b) => Number(a.code !== null) - Number(b.code !== null));

const missing = Object.keys(COUNTRIES).filter((c) => !found.has(c));
if (missing.length) console.warn(`No boundary for: ${missing.join(", ")}`);

const out = { width: WIDTH, height: HEIGHT, features };
const json = JSON.stringify(out);
await writeFile(new URL("../src/components/map/europe-paths.json", import.meta.url), json + "\n");
console.log(
  `Wrote ${features.length} features (${found.size} with data codes), ${(json.length / 1024).toFixed(0)} KB`,
);
