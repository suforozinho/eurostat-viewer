"use client";

import { useId, useRef, useState, type PointerEvent } from "react";
import { useTranslations } from "next-intl";
import { scaleQuantile } from "d3-scale";
import type { RankingRow } from "@/lib/derive";
import geometry from "./europe-paths.json";

interface MapFeature {
  code: string | null;
  d: string;
  dot?: [number, number];
}

const MAP = geometry as { width: number; height: number; features: MapFeature[] };
const CLASSES = 5;

export interface ChoroplethMapProps {
  rows: RankingRow[];
  /** Countries that appear in this dataset in any year. */
  datasetCountries: Set<string>;
  nameOf: (code: string) => string;
  /** Countries in the comparison; they get a dark outline. */
  selected: string[];
  formatValue: (value: number) => string;
  title: string;
  summary: string;
}

function Hatch({ id }: { id: string }) {
  return (
    <pattern
      id={id}
      width="6"
      height="6"
      patternUnits="userSpaceOnUse"
      patternTransform="rotate(45)"
    >
      <rect width="6" height="6" fill="var(--nodata-bg)" />
      <line x1="0" y1="0" x2="0" y2="6" stroke="var(--nodata-line)" strokeWidth="1.5" />
    </pattern>
  );
}

/**
 * Choropleth for one year. Five quantile classes (each holds about a fifth of
 * the countries) on a single-hue sequential ramp. Three non-value states are
 * kept visually apart: hatched for "in the dataset, but no value this year",
 * flat grey for countries the dataset does not cover, and the sea.
 *
 * The geometry is pre-projected at build time (see scripts/build-map.ts), and
 * this whole module is loaded only when someone opens the map tab.
 */
export default function ChoroplethMap({
  rows,
  datasetCountries,
  nameOf,
  selected,
  formatValue,
  title,
  summary,
}: ChoroplethMapProps) {
  const t = useTranslations("map");
  const uid = useId().replace(/:/g, "");
  const hatchId = `hatch-${uid}`;
  const containerRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ code: string; x: number; y: number; width: number } | null>(
    null,
  );

  const byCode = new Map(rows.map((r) => [r.code, r]));
  const values = rows.map((r) => r.value);
  const scale = scaleQuantile<number>()
    .domain(values)
    .range([...Array(CLASSES).keys()]);
  const bounds = [Math.min(...values), ...scale.quantiles(), Math.max(...values)];
  const selectedSet = new Set(selected);

  function onPointerMove(event: PointerEvent<SVGElement>, code: string) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHover({
      code,
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      width: rect.width,
    });
  }

  function fillFor(code: string | null): string {
    if (!code || !datasetCountries.has(code)) return "var(--map-context)";
    const row = byCode.get(code);
    return row ? `var(--seq-${scale(row.value) + 1})` : `url(#${hatchId})`;
  }

  const hovered = hover ? byCode.get(hover.code) : undefined;

  return (
    <div>
      <div ref={containerRef} className="relative" onPointerLeave={() => setHover(null)}>
        <svg
          viewBox={`0 0 ${MAP.width} ${MAP.height}`}
          role="img"
          aria-labelledby={`${uid}-title ${uid}-desc`}
          className="border-line bg-surface block h-auto w-full rounded-lg border"
        >
          <title id={`${uid}-title`}>{title}</title>
          <desc id={`${uid}-desc`}>{summary}</desc>
          <defs>
            <Hatch id={hatchId} />
          </defs>

          {MAP.features.map((f, i) => {
            const active = f.code !== null && datasetCountries.has(f.code);
            return (
              <path
                key={i}
                d={f.d}
                fill={fillFor(f.code)}
                stroke={active ? "var(--map-line)" : "var(--map-context-line)"}
                strokeWidth={0.7}
                strokeLinejoin="round"
                onPointerMove={active ? (e) => onPointerMove(e, f.code!) : undefined}
                onPointerDown={active ? (e) => onPointerMove(e, f.code!) : undefined}
              />
            );
          })}

          {/* Outlines of compared countries, drawn on top so they are never hidden by a neighbour. */}
          {MAP.features
            .filter((f) => f.code && selectedSet.has(f.code))
            .map((f) => (
              <path
                key={`sel-${f.code}`}
                d={f.d}
                fill="none"
                stroke="var(--text)"
                strokeWidth={1.8}
                strokeLinejoin="round"
                pointerEvents="none"
              />
            ))}

          {/* Very small countries (Malta, Liechtenstein, San Marino…) get a dot you can see and hover. */}
          {MAP.features
            .filter((f) => f.dot && f.code && datasetCountries.has(f.code))
            .map((f) => (
              <circle
                key={`dot-${f.code}`}
                cx={f.dot![0]}
                cy={f.dot![1]}
                r={5}
                fill={fillFor(f.code)}
                stroke={selectedSet.has(f.code!) ? "var(--text)" : "var(--text-3)"}
                strokeWidth={selectedSet.has(f.code!) ? 1.8 : 1}
                onPointerMove={(e) => onPointerMove(e, f.code!)}
                onPointerDown={(e) => onPointerMove(e, f.code!)}
              />
            ))}
        </svg>

        {hover ? (
          <div
            aria-hidden="true"
            className="border-line bg-surface pointer-events-none absolute z-10 rounded-md border px-3 py-2 text-sm shadow-lg"
            style={{
              left: Math.min(hover.x + 14, Math.max(0, hover.width - 200)),
              top: hover.y + 14,
            }}
          >
            <p className="text-ink font-semibold">{nameOf(hover.code)}</p>
            <p className="text-ink-2 tabular-nums">
              {hovered ? formatValue(hovered.value) : t("noData")}
            </p>
          </div>
        ) : null}
      </div>

      <div className="mt-3">
        <p className="text-ink-2 mb-1.5 text-sm">{t("legendTitle")}</p>
        <ul className="text-ink-2 flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
          {[...Array(CLASSES).keys()].map((i) => (
            <li key={i} className="flex items-center gap-1.5">
              <svg width="18" height="14" aria-hidden="true">
                <rect width="18" height="14" rx="2" fill={`var(--seq-${i + 1})`} />
              </svg>
              <span className="tabular-nums">
                {t("range", { from: formatValue(bounds[i]), to: formatValue(bounds[i + 1]) })}
              </span>
            </li>
          ))}
          <li className="flex items-center gap-1.5">
            <svg width="18" height="14" aria-hidden="true">
              <defs>
                <Hatch id={`${hatchId}-legend`} />
              </defs>
              <rect
                width="18"
                height="14"
                rx="2"
                fill={`url(#${hatchId}-legend)`}
                stroke="var(--nodata-line)"
                strokeWidth="0.5"
              />
            </svg>
            {t("noData")}
          </li>
          <li className="flex items-center gap-1.5">
            <svg width="18" height="14" aria-hidden="true">
              <rect width="18" height="14" rx="2" fill="var(--map-context)" stroke="var(--line)" />
            </svg>
            {t("notCovered")}
          </li>
        </ul>
      </div>
    </div>
  );
}
