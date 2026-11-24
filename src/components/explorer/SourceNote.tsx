"use client";

import { useLocale, useTranslations } from "next-intl";
import { formatDate } from "@/lib/format";
import type { SeriesPayload } from "@/lib/series/schema";

/** Credits Eurostat and shows its own (English) labels for the dataset and unit. */
export function SourceNote({
  payload,
  intlLocale,
}: {
  payload: SeriesPayload;
  intlLocale: string;
}) {
  const t = useTranslations("source");
  const locale = useLocale();
  const updated = payload.updated ? formatDate(payload.updated, intlLocale) : null;

  return (
    <aside
      aria-label={t("label")}
      className="border-line bg-surface text-ink-2 mt-6 space-y-2 rounded-lg border p-4 text-sm"
    >
      <p>
        <span className="text-ink font-semibold">{t("label")}</span>{" "}
        <a
          href={payload.sourceUrl}
          className="text-accent underline underline-offset-2"
          hrefLang="en"
        >
          {t("eurostat")}, {t("dataset", { code: payload.dataset })}
        </a>
      </p>
      <dl className="grid gap-x-3 gap-y-1 sm:grid-cols-[max-content_1fr]">
        <dt className="text-ink-3">{t("datasetTitle")}</dt>
        <dd lang="en">{payload.datasetLabel}</dd>
        <dt className="text-ink-3">{t("unit")}</dt>
        <dd lang="en">{payload.unitLabel}</dd>
      </dl>
      {updated ? <p>{t("updated", { date: updated })}</p> : null}
      {locale !== "en" ? <p className="text-ink-3">{t("englishNote")}</p> : null}
    </aside>
  );
}
