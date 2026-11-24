"use client";

import { useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { useTranslations } from "next-intl";
import { scaleLinear } from "d3-scale";
import type { TrendRow } from "@/lib/derive";
import { spreadLabels } from "@/lib/label-layout";
import { useElementWidth } from "@/hooks/useElementWidth";
import { linePath, nearestIndex, yearTicks } from "./geometry";
import { ShapeMark, SeriesSwatch, seriesColor } from "./series";
import type { TrendSeries } from "./TrendLegend";

export interface TrendChartProps {
  rows: TrendRow[];
  series: TrendSeries[];
  formatValue: (value: number) => string;
  formatAxis: (value: number) => string;
  flagOf: (country: string, year: number) => string | null;
  /** Direct labels at the end of each line; turned off on narrow screens, where the legend does the job. */
  endLabels: boolean;
  /** Short text description, used as the chart's accessible name. */
  summary: string;
  /** Fixed width for tests; otherwise the chart fills its container. */
  width?: number;
}

const LABEL_GAP = 15;

/**
 * Line chart for up to five countries, drawn as plain SVG.
 *
 * - Gaps in the data stay gaps; every point has a marker, so a value
 *   surrounded by missing years is still visible.
 * - Hover, or focus the chart and use the arrow keys, to move a crosshair
 *   across the years. The values for that year appear in a tooltip and are
 *   announced to screen readers.
 */
export function TrendChart(props: TrendChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const measured = useElementWidth(ref);
  const width = props.width ?? measured;
  const height = props.endLabels ? 400 : 320;
  return (
    <div ref={ref} style={{ height }} className="relative w-full">
      {width > 0 ? <TrendSvg {...props} width={width} height={height} /> : null}
    </div>
  );
}

function TrendSvg({
  rows,
  series,
  formatValue,
  formatAxis,
  flagOf,
  endLabels,
  summary,
  width,
  height,
}: TrendChartProps & { width: number; height: number }) {
  const t = useTranslations();
  const hintId = useId();
  const [active, setActive] = useState<number | null>(null);

  const longestName = Math.max(...series.map((s) => s.name.length));
  const margin = {
    top: 16,
    right: endLabels ? Math.min(150, 24 + longestName * 7) : 16,
    bottom: 28,
    left: 60,
  };
  const innerWidth = Math.max(10, width - margin.left - margin.right);
  const innerHeight = height - margin.top - margin.bottom;

  const years = rows.map((r) => r.year);
  const first = years[0];
  const last = years[years.length - 1];
  const values = rows
    .flatMap((r) => series.map((s) => r[s.code]))
    .filter((v): v is number => v !== null);

  const x = scaleLinear()
    .domain(first === last ? [first - 1, last + 1] : [first, last])
    .range([12, innerWidth - 12]);
  let [low, high] = [Math.min(...values), Math.max(...values)];
  if (low === high) [low, high] = [low - 1, high + 1];
  const y = scaleLinear().domain([low, high]).nice(5).range([innerHeight, 0]);

  const xs = years.map((year) => x(year));
  const point = (row: TrendRow, i: number, code: string) =>
    row[code] === null ? null : { x: xs[i], y: y(row[code]!) };

  // Direct labels at each line's last value, spread so they never overlap.
  const ends = series.flatMap((s) => {
    for (let i = rows.length - 1; i >= 0; i--) {
      const v = rows[i][s.code];
      if (v !== null) return [{ key: s.code, name: s.name, x: xs[i], y: y(v) }];
    }
    return [];
  });
  const labelY = spreadLabels(ends, LABEL_GAP, { min: 0, max: innerHeight });

  function onPointerMove(event: PointerEvent<SVGRectElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    setActive(nearestIndex(xs, event.clientX - box.left));
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const lastIndex = rows.length - 1;
    const current = active ?? lastIndex;
    const next = {
      ArrowLeft: Math.max(0, current - 1),
      ArrowRight: Math.min(lastIndex, current + 1),
      Home: 0,
      End: lastIndex,
    }[event.key];
    if (next !== undefined) {
      event.preventDefault();
      // The first key press shows the latest year; later ones move.
      setActive(active === null ? current : next);
    } else if (event.key === "Escape") {
      setActive(null);
    }
  }

  const activeRow = active === null ? null : rows[active];
  const activeX = active === null ? 0 : xs[active] + margin.left;
  const activeItems = activeRow
    ? series
        .map((s) => ({ ...s, value: activeRow[s.code] }))
        .filter((s): s is TrendSeries & { value: number } => s.value !== null)
        .sort((a, b) => b.value - a.value)
    : [];
  const flagLabel = (flag: string) => (t.has(`flags.${flag}`) ? t(`flags.${flag}`) : flag);
  const announcement = activeRow
    ? `${activeRow.year}: ${activeItems.map((i) => `${i.name} ${formatValue(i.value)}`).join(", ") || t("chart.noValue")}`
    : "";

  return (
    <div
      role="group"
      aria-label={summary}
      aria-describedby={hintId}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onBlur={() => setActive(null)}
      className="h-full w-full"
    >
      <span id={hintId} className="sr-only">
        {t("chart.keyboardHint")}
      </span>
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
      <svg width={width} height={height} aria-hidden="true" className="block overflow-visible">
        <g transform={`translate(${margin.left},${margin.top})`}>
          {y.ticks(5).map((tick) => (
            <g key={tick} transform={`translate(0,${y(tick)})`}>
              <line x2={innerWidth} stroke="var(--grid)" />
              <text x={-10} dy="0.32em" textAnchor="end" fontSize={12} fill="var(--text-3)">
                {formatAxis(tick)}
              </text>
            </g>
          ))}
          <line y1={innerHeight} y2={innerHeight} x2={innerWidth} stroke="var(--line)" />
          {yearTicks(first, last, innerWidth).map((year) => (
            <text
              key={year}
              x={x(year)}
              y={innerHeight + 20}
              textAnchor="middle"
              fontSize={12}
              fill="var(--text-3)"
            >
              {year}
            </text>
          ))}

          {active !== null ? (
            <line
              x1={xs[active]}
              x2={xs[active]}
              y2={innerHeight}
              stroke="var(--text-3)"
              strokeWidth={1}
            />
          ) : null}

          {series.map((s) => (
            <g key={s.code}>
              <path
                d={linePath(rows.map((r, i) => point(r, i, s.code)))}
                fill="none"
                stroke={seriesColor(s.slot)}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {rows.map((r, i) => {
                const p = point(r, i, s.code);
                return p ? (
                  <ShapeMark
                    key={r.year}
                    slot={s.slot}
                    x={p.x}
                    y={p.y}
                    size={i === active ? 12 : 8}
                  />
                ) : null;
              })}
            </g>
          ))}

          {endLabels
            ? ends.map((e) => (
                <text
                  key={e.key}
                  x={e.x + 12}
                  y={labelY[e.key]}
                  dy="0.32em"
                  fontSize={12}
                  fontWeight={600}
                  fill="var(--text-2)"
                >
                  {e.name}
                </text>
              ))
            : null}

          {/* Hit area for the crosshair: the whole plot, not just the thin lines. */}
          <rect
            width={innerWidth}
            height={innerHeight}
            fill="transparent"
            onPointerMove={onPointerMove}
            onPointerDown={onPointerMove}
            onPointerLeave={() => setActive(null)}
          />
        </g>
      </svg>

      {activeRow && activeItems.length > 0 ? (
        <div
          aria-hidden="true"
          className="border-line bg-surface pointer-events-none absolute top-2 z-10 min-w-48 rounded-md border p-3 text-sm shadow-lg"
          style={activeX > width / 2 ? { right: width - activeX + 16 } : { left: activeX + 16 }}
        >
          <p className="text-ink mb-1.5 font-semibold">{activeRow.year}</p>
          <ul className="space-y-1">
            {activeItems.map((item) => {
              const flag = flagOf(item.code, activeRow.year);
              return (
                <li key={item.code} className="flex items-center gap-2">
                  <SeriesSwatch slot={item.slot} />
                  <span className="text-ink-2">{item.name}</span>
                  <span className="text-ink ml-auto pl-3 font-medium tabular-nums">
                    {formatValue(item.value)}
                    {flag ? (
                      <span className="text-ink-3 ml-1 text-xs font-normal">
                        ({flagLabel(flag)})
                      </span>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
