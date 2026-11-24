"use client";

import { useRef, type KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { VIEWS, type View } from "@/lib/url-state";

export const tabId = (view: View) => `tab-${view}`;
export const PANEL_ID = "view-panel";

/**
 * WAI-ARIA tabs with automatic activation: Left/Right/Home/End move between
 * tabs and select them, and only the selected tab is in the Tab order.
 */
export function ViewTabs({ value, onChange }: { value: View; onChange: (view: View) => void }) {
  const t = useTranslations("views");
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const i = VIEWS.indexOf(value);
    const next = {
      ArrowRight: VIEWS[(i + 1) % VIEWS.length],
      ArrowLeft: VIEWS[(i - 1 + VIEWS.length) % VIEWS.length],
      Home: VIEWS[0],
      End: VIEWS[VIEWS.length - 1],
    }[event.key];
    if (!next) return;
    event.preventDefault();
    onChange(next);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={t("label")}
      className="border-line bg-surface-2 inline-flex rounded-lg border p-1"
    >
      {VIEWS.map((view) => {
        const selected = view === value;
        return (
          <button
            key={view}
            ref={(el) => {
              refs.current[view] = el;
            }}
            id={tabId(view)}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={selected ? PANEL_ID : undefined}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(view)}
            onKeyDown={onKeyDown}
            className={`min-h-10 rounded-md px-3 text-sm font-medium sm:px-4 ${
              selected ? "bg-surface text-ink shadow-sm" : "text-ink-2 hover:text-ink"
            }`}
          >
            {t(view)}
          </button>
        );
      })}
    </div>
  );
}
