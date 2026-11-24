"use client";

import { useTranslations } from "next-intl";
import { INDICATORS, type IndicatorId } from "@/lib/indicators";

/** A native radio group: arrow keys move between options, and screen readers announce "n of 8". */
export function IndicatorPicker({
  value,
  onChange,
}: {
  value: IndicatorId;
  onChange: (id: IndicatorId) => void;
}) {
  const t = useTranslations();
  return (
    <fieldset>
      <legend className="text-ink mb-2 text-sm font-semibold">{t("controls.indicator")}</legend>
      <div className="grid gap-1.5">
        {INDICATORS.map((indicator) => {
          const checked = indicator.id === value;
          return (
            <label
              key={indicator.id}
              className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus)] ${
                checked
                  ? "border-accent bg-accent-soft text-ink font-semibold"
                  : "border-line bg-surface text-ink-2 hover:bg-surface-2"
              }`}
            >
              <input
                type="radio"
                name="indicator"
                value={indicator.id}
                checked={checked}
                onChange={() => onChange(indicator.id)}
                className="size-4 shrink-0 accent-[var(--accent)] focus-visible:outline-none"
              />
              {t(`indicators.${indicator.id}.name`)}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
