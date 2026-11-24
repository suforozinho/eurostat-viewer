"use client";

import { useTranslations } from "next-intl";
import { SeriesSwatch } from "./series";

export interface TrendSeries {
  code: string;
  name: string;
  slot: number;
}

/** Legend in HTML (not SVG) so it wraps, scales with text size and is read by screen readers. */
export function TrendLegend({ series }: { series: TrendSeries[] }) {
  const t = useTranslations("chart");
  return (
    <ul aria-label={t("legend")} className="text-ink-2 mb-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
      {series.map((s) => (
        <li key={s.code} className="flex items-center gap-1.5">
          <SeriesSwatch slot={s.slot} />
          {s.name}
        </li>
      ))}
    </ul>
  );
}
