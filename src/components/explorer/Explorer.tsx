"use client";

import { useCallback, useDeferredValue, useMemo } from "react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { INTL_LOCALE, type AppLocale } from "@/i18n/routing";
import { getIndicator } from "@/lib/indicators";
import { COUNTRIES } from "@/lib/countries";
import { countryName, formatAxisValue, formatValue } from "@/lib/format";
import {
  countriesWithData,
  indexObservations,
  observationKey,
  rankingRows,
  resolveYears,
  trendRows,
} from "@/lib/derive";
import { fetchSeries, SeriesFetchError } from "@/lib/series/fetch-series";
import type { SeriesPayload } from "@/lib/series/schema";
import type { ExplorerState } from "@/lib/url-state";
import { useExplorerState } from "@/hooks/useExplorerState";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useSlots } from "@/hooks/useSlots";
import { IndicatorPicker } from "@/components/controls/IndicatorPicker";
import { CountryPicker } from "@/components/controls/CountryPicker";
import { PeriodPicker, YearPicker } from "@/components/controls/YearControls";
import { PANEL_ID, ViewTabs, tabId } from "@/components/controls/ViewTabs";
import { DisplayToggle } from "@/components/controls/DisplayToggle";
import { EmptyState, ErrorState, LoadingState } from "@/components/status/StatusViews";
import { TrendLegend } from "@/components/charts/TrendLegend";
import { TrendChart } from "@/components/charts/TrendChart";
import { RankingChart } from "@/components/charts/RankingChart";
import { RankingTable, TrendTable } from "@/components/charts/DataTables";
import { SourceNote } from "./SourceNote";

function MapLoading() {
  const t = useTranslations("map");
  return <LoadingState label={t("loading")} />;
}

// The map (geometry + d3-scale) is a separate chunk, fetched only when the map tab opens.
const ChoroplethMap = dynamic(() => import("@/components/map/ChoroplethMap"), {
  ssr: false,
  loading: MapLoading,
});

/** Everything the views need to name, format and annotate values. */
interface ViewContext {
  payload: SeriesPayload;
  state: ExplorerState;
  years: { from: number; to: number; year: number };
  slots: Record<string, number>;
  nameOf: (code: string) => string;
  format: (value: number) => string;
  formatAxis: (value: number) => string;
  indicatorName: string;
  intlLocale: string;
}

export function Explorer() {
  const t = useTranslations();
  const locale = useLocale() as AppLocale;
  const intlLocale = INTL_LOCALE[locale] ?? "en-GB";
  const [state, update] = useExplorerState();
  const indicator = getIndicator(state.indicator);
  const slots = useSlots(state.countries);

  const query = useQuery({
    queryKey: ["series", state.indicator],
    queryFn: ({ signal }) => fetchSeries(state.indicator, signal),
  });
  // TanStack Query delivers data through useSyncExternalStore, which renders
  // synchronously. Deferring it lets React render the charts at transition
  // priority, in small slices, so the page stays responsive while they draw.
  const deferred = useDeferredValue(query.data);
  // Never show the previous indicator's data under the new indicator's title.
  const payload = deferred?.indicator === state.indicator ? deferred : undefined;

  const eurostatNames = useMemo(
    () => new Map(payload?.countries.map((c) => [c.code, c.name]) ?? []),
    [payload],
  );
  const nameOf = useCallback(
    (code: string) => countryName(code, intlLocale, eurostatNames.get(code)),
    [intlLocale, eurostatNames],
  );
  const format = useCallback(
    (value: number) => formatValue(value, indicator.unit, indicator.decimals, intlLocale),
    [indicator, intlLocale],
  );
  const formatAxis = useCallback(
    (value: number) => formatAxisValue(value, indicator.unit, intlLocale),
    [indicator, intlLocale],
  );

  // Countries offered in the picker: those with data for this indicator, by localized name.
  const options = useMemo(() => {
    const codes = payload ? payload.countries.map((c) => c.code) : Object.keys(COUNTRIES);
    const collator = new Intl.Collator(intlLocale);
    return codes
      .map((code) => ({ code, name: nameOf(code) }))
      .sort((a, b) => collator.compare(a.name, b.name));
  }, [payload, nameOf, intlLocale]);

  const years = payload ? resolveYears(payload, state) : null;
  const indicatorName = t(`indicators.${state.indicator}.name`);

  let content: React.ReactNode;
  if (query.isError) {
    const code = query.error instanceof SeriesFetchError ? query.error.code : "upstream";
    content = (
      <ErrorState code={code} onRetry={() => query.refetch()} retrying={query.isFetching} />
    );
  } else if (payload && years) {
    const ctx: ViewContext = {
      payload,
      state,
      years,
      slots,
      nameOf,
      format,
      formatAxis,
      indicatorName,
      intlLocale,
    };
    content =
      state.view === "trend" ? (
        <TrendView {...ctx} />
      ) : (
        <SnapshotView {...ctx} map={state.view === "map"} />
      );
  } else {
    content = <LoadingState />;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[19rem_minmax(0,1fr)]">
      <aside
        aria-labelledby="controls-heading"
        className="space-y-6 lg:sticky lg:top-4 lg:self-start"
      >
        <h2 id="controls-heading" className="sr-only">
          {t("controls.heading")}
        </h2>
        <IndicatorPicker
          value={state.indicator}
          // Years with good coverage differ per dataset, so the snapshot year resets.
          onChange={(id) => update({ indicator: id, year: null })}
        />
        <CountryPicker
          selected={state.countries}
          options={options}
          slots={slots}
          nameOf={nameOf}
          onChange={(countries) => update({ countries })}
        />
        {state.view === "trend" ? (
          <PeriodPicker
            years={payload?.years ?? []}
            from={years?.from ?? null}
            to={years?.to ?? null}
            onChange={(range) => update(range)}
          />
        ) : (
          <YearPicker
            years={payload?.years ?? []}
            year={years?.year ?? null}
            onChange={(year) => update({ year })}
          />
        )}
      </aside>

      <section id="explorer" tabIndex={-1} aria-labelledby="indicator-heading" className="min-w-0">
        <div className="mb-4">
          <h2 id="indicator-heading" className="text-2xl font-semibold tracking-tight">
            {indicatorName}
          </h2>
          <p className="text-ink-2 mt-1 max-w-3xl">
            {t(`indicators.${state.indicator}.description`)}
          </p>
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <ViewTabs value={state.view} onChange={(view) => update({ view })} />
          <DisplayToggle value={state.display} onChange={(display) => update({ display })} />
        </div>

        <div role="tabpanel" id={PANEL_ID} aria-labelledby={tabId(state.view)}>
          {content}
        </div>

        {payload ? <SourceNote payload={payload} intlLocale={intlLocale} /> : null}
      </section>
    </div>
  );
}

function useFlagLookup(payload: SeriesPayload) {
  const index = useMemo(() => indexObservations(payload), [payload]);
  return useCallback(
    (country: string, year: number) => index.get(observationKey(country, year))?.flag ?? null,
    [index],
  );
}

function TrendView({
  payload,
  state,
  years,
  slots,
  nameOf,
  format,
  formatAxis,
  indicatorName,
  intlLocale,
}: ViewContext) {
  const t = useTranslations();
  const wide = useMediaQuery("(min-width: 640px)");
  const flagOf = useFlagLookup(payload);

  if (state.countries.length === 0) return <EmptyState message={t("status.noCountries")} />;

  const rows = trendRows(payload, state.countries, years.from, years.to);
  const withData = countriesWithData(rows, state.countries);
  if (withData.length === 0) {
    return (
      <EmptyState message={t("status.noDataForSelection", { from: years.from, to: years.to })} />
    );
  }

  const list = new Intl.ListFormat(intlLocale, { type: "conjunction" });
  const missing = state.countries.filter((c) => !withData.includes(c));
  const series = withData.map((code) => ({ code, name: nameOf(code), slot: slots[code] ?? 0 }));
  const title = t("chart.trendTitle", { indicator: indicatorName, from: years.from, to: years.to });
  const summary = t("chart.trendSummary", {
    countries: list.format(series.map((s) => s.name)),
    from: years.from,
    to: years.to,
  });

  return (
    <figure>
      <figcaption className="mb-2">
        <h3 className="text-lg font-semibold">{title}</h3>
      </figcaption>
      {state.display === "chart" ? (
        <>
          <TrendLegend series={series} />
          <TrendChart
            rows={rows}
            series={series}
            formatValue={format}
            formatAxis={formatAxis}
            flagOf={flagOf}
            endLabels={wide && series.length <= 5}
            summary={summary}
          />
        </>
      ) : (
        <TrendTable
          caption={title}
          rows={rows}
          series={series}
          formatValue={format}
          flagOf={flagOf}
        />
      )}
      {missing.length > 0 ? (
        <p className="text-ink-2 mt-3 text-sm">
          {t("status.missingCountries", { countries: list.format(missing.map(nameOf)) })}
        </p>
      ) : null}
    </figure>
  );
}

function SnapshotView({
  payload,
  state,
  years,
  slots,
  nameOf,
  format,
  formatAxis,
  indicatorName,
  map,
}: ViewContext & { map: boolean }) {
  const t = useTranslations();
  const year = years.year;
  const rows = useMemo(() => rankingRows(payload, year), [payload, year]);
  const datasetCountries = useMemo(() => new Set(payload.countries.map((c) => c.code)), [payload]);

  if (rows.length === 0) return <EmptyState message={t("status.noDataForYear", { year })} />;

  const present = new Set(rows.map((r) => r.code));
  const missing = payload.countries.map((c) => c.code).filter((c) => !present.has(c));
  const top = rows[0];
  const bottom = rows[rows.length - 1];
  const describe = (r: (typeof rows)[number]) => `${nameOf(r.code)} (${format(r.value)})`;
  const selectedSlots = Object.fromEntries(
    Object.entries(slots).filter(([code]) => state.countries.includes(code)),
  );

  const title = t(map ? "chart.mapTitle" : "chart.rankingTitle", {
    indicator: indicatorName,
    year,
  });
  const summary = map
    ? t("map.summary", { count: rows.length, year, top: describe(top), bottom: describe(bottom) })
    : t("chart.rankingSummary", {
        count: rows.length,
        year,
        top: describe(top),
        bottom: describe(bottom),
      });

  return (
    <figure>
      <figcaption className="mb-2">
        <h3 className="text-lg font-semibold">{title}</h3>
        {state.display === "chart" && state.countries.length > 0 ? (
          <p className="text-ink-2 text-sm">
            {t(map ? "chart.selectedHintMap" : "chart.selectedHint")}
          </p>
        ) : null}
      </figcaption>
      {state.display === "table" ? (
        <RankingTable
          caption={t("table.rankingCaption", { indicator: indicatorName, year })}
          rows={rows}
          missing={missing}
          nameOf={nameOf}
          slots={selectedSlots}
          formatValue={format}
        />
      ) : map ? (
        <ChoroplethMap
          rows={rows}
          datasetCountries={datasetCountries}
          nameOf={nameOf}
          selected={state.countries}
          formatValue={format}
          title={title}
          summary={summary}
        />
      ) : (
        <RankingChart
          rows={rows}
          nameOf={nameOf}
          slots={selectedSlots}
          formatValue={format}
          formatAxis={formatAxis}
          summary={summary}
        />
      )}
    </figure>
  );
}
