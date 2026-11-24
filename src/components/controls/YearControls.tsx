"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";

const selectClass =
  "min-h-11 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink disabled:opacity-60";

/** From/to years for the trend chart. Options that would invert the range are disabled. */
export function PeriodPicker({
  years,
  from,
  to,
  onChange,
}: {
  years: number[];
  from: number | null;
  to: number | null;
  onChange: (range: { from: number; to: number }) => void;
}) {
  const t = useTranslations("controls");
  const fromId = useId();
  const toId = useId();
  const disabled = years.length === 0 || from === null || to === null;

  return (
    <fieldset disabled={disabled}>
      <legend className="text-ink mb-2 text-sm font-semibold">{t("period")}</legend>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={fromId} className="text-ink-2 mb-1 block text-sm">
            {t("from")}
          </label>
          <select
            id={fromId}
            className={selectClass}
            value={from ?? ""}
            onChange={(e) => onChange({ from: Number(e.target.value), to: to! })}
          >
            {years.map((y) => (
              <option key={y} value={y} disabled={to !== null && y > to}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={toId} className="text-ink-2 mb-1 block text-sm">
            {t("to")}
          </label>
          <select
            id={toId}
            className={selectClass}
            value={to ?? ""}
            onChange={(e) => onChange({ from: from!, to: Number(e.target.value) })}
          >
            {years.map((y) => (
              <option key={y} value={y} disabled={from !== null && y < from}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>
    </fieldset>
  );
}

/** Single year for the ranking and the map, with previous/next buttons. */
export function YearPicker({
  years,
  year,
  onChange,
}: {
  years: number[];
  year: number | null;
  onChange: (year: number) => void;
}) {
  const t = useTranslations("controls");
  const id = useId();
  const index = year === null ? -1 : years.indexOf(year);
  const buttonClass =
    "grid min-h-11 min-w-11 place-items-center rounded-md border border-line bg-surface text-ink hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div>
      <label htmlFor={id} className="text-ink mb-1 block text-sm font-semibold">
        {t("year")}
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          className={buttonClass}
          onClick={() => onChange(years[index - 1])}
          disabled={index <= 0}
          aria-label={t("previousYear")}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>
        <select
          id={id}
          className={selectClass}
          value={year ?? ""}
          disabled={years.length === 0}
          onChange={(e) => onChange(Number(e.target.value))}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <button
          type="button"
          className={buttonClass}
          onClick={() => onChange(years[index + 1])}
          disabled={index === -1 || index >= years.length - 1}
          aria-label={t("nextYear")}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
