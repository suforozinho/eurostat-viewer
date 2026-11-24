"use client";

import { useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { MAX_COUNTRIES } from "@/lib/url-state";
import { SeriesSwatch } from "@/components/charts/series";

export interface CountryOption {
  code: string;
  name: string;
}

/**
 * Selected countries as removable chips, plus a native <select> to add one.
 * A native select is fully keyboard and screen-reader accessible and opens
 * the platform picker on phones, with no custom combobox to get wrong.
 */
export function CountryPicker({
  selected,
  options,
  slots,
  nameOf,
  onChange,
}: {
  selected: string[];
  /** Countries that have data for this indicator, sorted by name. */
  options: CountryOption[];
  slots: Record<string, number>;
  nameOf: (code: string) => string;
  onChange: (countries: string[]) => void;
}) {
  const t = useTranslations("controls");
  const selectId = useId();
  const hintId = useId();
  const selectRef = useRef<HTMLSelectElement>(null);
  const [announcement, setAnnouncement] = useState("");
  const full = selected.length >= MAX_COUNTRIES;
  const available = new Set(options.map((o) => o.code));

  function add(code: string) {
    if (!code || full || selected.includes(code)) return;
    onChange([...selected, code]);
    setAnnouncement(t("added", { country: nameOf(code) }));
  }

  function remove(code: string) {
    onChange(selected.filter((c) => c !== code));
    setAnnouncement(t("removed", { country: nameOf(code) }));
    // The chip's button is about to disappear; keep focus somewhere useful.
    selectRef.current?.focus();
  }

  return (
    <fieldset aria-describedby={hintId}>
      <legend className="text-ink mb-1 text-sm font-semibold">{t("countries")}</legend>
      <p id={hintId} className="text-ink-3 mb-2 text-sm">
        {t("countriesHint", { max: MAX_COUNTRIES })}
      </p>

      {selected.length > 0 ? (
        <ul className="mb-3 flex flex-wrap gap-1.5">
          {selected.map((code) => (
            <li
              key={code}
              className="border-line bg-surface flex items-center gap-1.5 rounded-full border py-0.5 pr-0.5 pl-2.5 text-sm"
            >
              <SeriesSwatch slot={slots[code] ?? 0} />
              <span>
                {nameOf(code)}
                {!available.has(code) && options.length > 0 ? (
                  <span className="text-ink-3"> {t("noDataSuffix")}</span>
                ) : null}
              </span>
              <button
                type="button"
                onClick={() => remove(code)}
                aria-label={t("remove", { country: nameOf(code) })}
                className="text-ink-2 hover:bg-surface-2 hover:text-ink grid size-8 place-items-center rounded-full"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                  <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.75" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-ink-2 mb-3 text-sm">{t("noCountries")}</p>
      )}

      <label htmlFor={selectId} className="text-ink-2 mb-1 block text-sm">
        {t("addCountry")}
      </label>
      <select
        id={selectId}
        ref={selectRef}
        value=""
        onChange={(e) => add(e.target.value)}
        aria-disabled={full || undefined}
        className="border-line bg-surface text-ink min-h-11 w-full rounded-md border px-3 text-sm"
      >
        <option value="">{t("addPlaceholder")}</option>
        {options.map((o) => (
          <option key={o.code} value={o.code} disabled={full || selected.includes(o.code)}>
            {o.name}
          </option>
        ))}
      </select>
      {full ? (
        <p className="text-ink-2 mt-2 text-sm" role="note">
          {t("maxReached", { max: MAX_COUNTRIES })}
        </p>
      ) : null}
      <p className="sr-only" aria-live="polite">
        {announcement ? `${announcement} ${t("selectedCount", { count: selected.length })}` : ""}
      </p>
    </fieldset>
  );
}
