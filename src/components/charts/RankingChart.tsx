"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { scaleLinear } from "d3-scale";
import type { RankingRow } from "@/lib/derive";
import { useElementWidth } from "@/hooks/useElementWidth";
import { barPath } from "./geometry";
import { seriesColor } from "./series";

export interface RankingChartProps {
  rows: RankingRow[];
  nameOf: (code: string) => string;
  slots: Record<string, number>;
  formatValue: (value: number) => string;
  formatAxis: (value: number) => string;
  /** Short text description, used as the chart's accessible name. */
  summary: string;
  /** Fixed width for tests; otherwise the chart fills its container. */
  width?: number;
}

const ROW = 24;
const BAR = 17;
const AXIS = 24;
const VALUE_WIDTH = 80;

/**
 * Every country for one year, highest first, drawn as plain SVG. Countries
 * in the comparison keep the color they have in the line chart and get a ◆
 * and a bold label, so the highlight never depends on color alone.
 */
export function RankingChart(props: RankingChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const measured = useElementWidth(ref);
  const width = props.width ?? measured;
  const height = AXIS + props.rows.length * ROW + 4;
  return (
    <div ref={ref} style={{ height }} className="relative w-full">
      {width > 0 ? <RankingSvg {...props} width={width} height={height} /> : null}
    </div>
  );
}

function RankingSvg({
  rows,
  nameOf,
  slots,
  formatValue,
  formatAxis,
  summary,
  width,
  height,
}: RankingChartProps & { width: number; height: number }) {
  const t = useTranslations();
  const hintId = useId();
  const [active, setActive] = useState<number | null>(null);

  const names = rows.map((r) => nameOf(r.code));
  const labelWidth = Math.min(180, 28 + Math.max(...names.map((n) => n.length)) * 7);
  const plotWidth = Math.max(10, width - labelWidth - VALUE_WIDTH);

  const values = rows.map((r) => r.value);
  const x = scaleLinear()
    .domain([Math.min(0, ...values), Math.max(0, ...values)])
    .nice(4)
    .range([0, plotWidth]);
  const zero = labelWidth + x(0);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const lastIndex = rows.length - 1;
    const current = active ?? -1;
    const next = {
      ArrowDown: Math.min(lastIndex, current + 1),
      ArrowUp: Math.max(0, current - 1),
      Home: 0,
      End: lastIndex,
    }[event.key];
    if (next !== undefined) {
      event.preventDefault();
      setActive(next);
    } else if (event.key === "Escape") {
      setActive(null);
    }
  }

  const activeRow = active === null ? null : rows[active];
  const flagLabel = (flag: string) => (t.has(`flags.${flag}`) ? t(`flags.${flag}`) : flag);
  const announcement = activeRow
    ? `${active! + 1}. ${names[active!]}: ${formatValue(activeRow.value)}${
        activeRow.flag ? ` (${flagLabel(activeRow.flag)})` : ""
      }`
    : "";

  return (
    <div
      role="group"
      aria-label={summary}
      aria-describedby={hintId}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onBlur={() => setActive(null)}
      onPointerLeave={() => setActive(null)}
      className="h-full w-full"
    >
      <span id={hintId} className="sr-only">
        {t("chart.rankingKeyboardHint")}
      </span>
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
      <svg width={width} height={height} aria-hidden="true" className="block">
        {x.ticks(4).map((tick) => (
          <g key={tick} transform={`translate(${labelWidth + x(tick)},${AXIS})`}>
            <line y2={rows.length * ROW} stroke="var(--grid)" />
            <text y={-8} textAnchor="middle" fontSize={12} fill="var(--text-3)">
              {formatAxis(tick)}
            </text>
          </g>
        ))}

        {rows.map((row, i) => {
          const selected = row.code in slots;
          const top = AXIS + i * ROW;
          const end = labelWidth + x(row.value);
          return (
            <g
              key={row.code}
              onPointerEnter={() => setActive(i)}
              onPointerDown={() => setActive(i)}
            >
              {/* Full-width row: a big hover target, and the highlight for the active row. */}
              <rect
                y={top}
                width={width}
                height={ROW}
                fill={i === active ? "var(--surface-2)" : "transparent"}
              />
              <text
                x={labelWidth - 8}
                y={top + ROW / 2}
                dy="0.32em"
                textAnchor="end"
                fontSize={12}
                fontWeight={selected ? 700 : 400}
                fill={selected ? "var(--text)" : "var(--text-2)"}
              >
                {selected ? "◆ " : ""}
                {names[i]}
              </text>
              <path
                d={barPath(zero, end, top + (ROW - BAR) / 2, BAR)}
                fill={selected ? seriesColor(slots[row.code]) : "var(--bar-neutral)"}
              />
              <text
                x={Math.max(zero, end) + 6}
                y={top + ROW / 2}
                dy="0.32em"
                fontSize={12}
                fill="var(--text-2)"
                className="tabular-nums"
              >
                {formatValue(row.value)}
              </text>
            </g>
          );
        })}
        <line x1={zero} x2={zero} y1={AXIS} y2={AXIS + rows.length * ROW} stroke="var(--line)" />
      </svg>
    </div>
  );
}
