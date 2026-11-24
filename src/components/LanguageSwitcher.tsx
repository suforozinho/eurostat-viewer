"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import type { AppLocale } from "@/i18n/routing";
import { toQueryString } from "@/lib/url-state";

function otherLocale(locale: string): AppLocale {
  return locale === "pt" ? "en" : "pt";
}

function SwitchLink({ query }: { query: string }) {
  const t = useTranslations("header");
  const target = otherLocale(useLocale());
  return (
    <nav aria-label={t("languageNav")}>
      {/* A full page load: the language is the root segment, so every string re-renders. */}
      <a
        href={`/${target}${query ? `?${query}` : ""}`}
        hrefLang={target}
        lang={target === "pt" ? "pt-PT" : "en"}
        aria-label={t("switchToLabel")}
        className="border-line bg-surface text-ink hover:bg-surface-2 inline-flex min-h-11 items-center rounded-md border px-3 text-sm font-medium"
      >
        {t("switchTo")}
      </a>
    </nav>
  );
}

/** Switches language and keeps the current view (indicator, countries, years). */
export function LanguageSwitcher() {
  const searchParams = useSearchParams();
  return <SwitchLink query={toQueryString(searchParams)} />;
}

/** Server-rendered version before the query string is known; still a working link. */
export function LanguageSwitcherFallback() {
  return <SwitchLink query="" />;
}
