"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import type { RankingRow, TrendRow } from "@/lib/derive";
import { SeriesSwatch } from "./series";
import type { TrendSeries } from "./TrendLegend";

/** "6.4%" plus a superscript Eurostat flag ("p") that screen readers hear in full ("provisional"). */
function Value({
  value,
  flag,
  format,
}: {
  value: number;
  flag: string | null;
  format: (v: number) => string;
}) {
  const t = useTranslations("flags");
  return (
    <>
      {format(value)}
      {flag ? (
        <>
          <sup aria-hidden="true" className="text-ink-3 ml-0.5">
            {flag}
          </sup>
          <span className="sr-only"> ({t.has(flag) ? t(flag) : flag})</span>
        </>
      ) : null}
    </>
  );
}

function Missing() {
  const t = useTranslations("chart");
  return (
    <>
      <span aria-hidden="true" className="text-ink-3">
        –
      </span>
      <span className="sr-only">{t("noValue")}</span>
    </>
  );
}

/** Lists the meaning of every flag that appears in the table. */
function FlagNotes({ flags }: { flags: Set<string> }) {
  const t = useTranslations();
  if (flags.size === 0) return null;
  return (
    <p className="text-ink-3 mt-2 text-xs">
      {t("table.flagsNote")}{" "}
      {[...flags]
        .sort()
        .map((f) => `${f} = ${t.has(`flags.${f}`) ? t(`flags.${f}`) : f}`)
        .join("; ")}
    </p>
  );
}

/** Scrollable wrapper that keyboard users can focus and scroll. */
function TableFrame({ captionId, children }: { captionId: string; children: React.ReactNode }) {
  return (
    <div
      role="region"
      aria-labelledby={captionId}
      tabIndex={0}
      className="border-line bg-surface max-h-[32rem] overflow-auto rounded-lg border"
    >
      {children}
    </div>
  );
}

const th = "sticky top-0 bg-surface-2 px-3 py-2 text-left font-semibold text-ink";

export function TrendTable({
  caption,
  rows,
  series,
  formatValue,
  flagOf,
}: {
  caption: string;
  rows: TrendRow[];
  series: TrendSeries[];
  formatValue: (value: number) => string;
  flagOf: (country: string, year: number) => string | null;
}) {
  const t = useTranslations("table");
  const captionId = useId();
  const flags = new Set<string>();

  return (
    <>
      <TableFrame captionId={captionId}>
        <table className="w-full border-collapse text-sm">
          <caption id={captionId} className="sr-only">
            {caption}
          </caption>
          <thead>
            <tr>
              <th scope="col" className={th}>
                {t("year")}
              </th>
              {series.map((s) => (
                <th key={s.code} scope="col" className={`${th} text-right`}>
                  <span className="inline-flex items-center gap-1.5">
                    <SeriesSwatch slot={s.slot} />
                    {s.name}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...rows].reverse().map((row) => (
              <tr key={row.year} className="border-line border-t">
                <th scope="row" className="text-ink px-3 py-1.5 text-left font-medium">
                  {row.year}
                </th>
                {series.map((s) => {
                  const value = row[s.code];
                  const flag = value === null ? null : flagOf(s.code, row.year);
                  if (flag) flags.add(flag);
                  return (
                    <td key={s.code} className="text-ink px-3 py-1.5 text-right tabular-nums">
                      {value === null ? (
                        <Missing />
                      ) : (
                        <Value value={value} flag={flag} format={formatValue} />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </TableFrame>
      <FlagNotes flags={flags} />
    </>
  );
}

export function RankingTable({
  caption,
  rows,
  missing,
  nameOf,
  slots,
  formatValue,
}: {
  caption: string;
  rows: RankingRow[];
  /** Countries in the dataset with no value this year, listed last. */
  missing: string[];
  nameOf: (code: string) => string;
  slots: Record<string, number>;
  formatValue: (value: number) => string;
}) {
  const t = useTranslations("table");
  const captionId = useId();
  const flags = new Set(rows.map((r) => r.flag).filter((f): f is string => f !== null));

  const nameCell = (code: string) => {
    const selected = code in slots;
    return (
      <th
        scope="row"
        className={`px-3 py-1.5 text-left ${selected ? "text-ink font-bold" : "text-ink font-normal"}`}
      >
        {selected ? (
          <span aria-hidden="true" className="mr-1">
            ◆
          </span>
        ) : null}
        {nameOf(code)}
      </th>
    );
  };

  return (
    <>
      <TableFrame captionId={captionId}>
        <table className="w-full border-collapse text-sm">
          <caption id={captionId} className="sr-only">
            {caption}
          </caption>
          <thead>
            <tr>
              <th scope="col" className={`${th} w-16 text-right`}>
                {t("rank")}
              </th>
              <th scope="col" className={th}>
                {t("country")}
              </th>
              <th scope="col" className={`${th} text-right`}>
                {t("value")}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.code} className="border-line border-t">
                <td className="text-ink-2 px-3 py-1.5 text-right tabular-nums">{i + 1}</td>
                {nameCell(row.code)}
                <td className="text-ink px-3 py-1.5 text-right tabular-nums">
                  <Value value={row.value} flag={row.flag} format={formatValue} />
                </td>
              </tr>
            ))}
            {missing.map((code) => (
              <tr key={code} className="border-line border-t">
                <td className="text-ink-3 px-3 py-1.5 text-right">
                  <Missing />
                </td>
                {nameCell(code)}
                <td className="px-3 py-1.5 text-right">
                  <Missing />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableFrame>
      <FlagNotes flags={flags} />
    </>
  );
}
