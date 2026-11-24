"use client";

import { useTranslations } from "next-intl";
import { DISPLAYS, type Display } from "@/lib/url-state";

/** Chart or table. The table is the text alternative for every chart. */
export function DisplayToggle({
  value,
  onChange,
}: {
  value: Display;
  onChange: (display: Display) => void;
}) {
  const t = useTranslations("display");
  return (
    <div
      role="group"
      aria-label={t("label")}
      className="border-line bg-surface-2 inline-flex rounded-lg border p-1"
    >
      {DISPLAYS.map((display) => (
        <button
          key={display}
          type="button"
          aria-pressed={display === value}
          onClick={() => onChange(display)}
          className={`min-h-10 rounded-md px-3 text-sm font-medium ${
            display === value ? "bg-surface text-ink shadow-sm" : "text-ink-2 hover:text-ink"
          }`}
        >
          {t(display)}
        </button>
      ))}
    </div>
  );
}
