"use client";

import { useTranslations } from "next-intl";
import type { SeriesErrorCode } from "@/lib/eurostat/errors";

/** Placeholder with the chart's footprint, so nothing jumps when data arrives. */
export function LoadingState({ label }: { label?: string }) {
  const t = useTranslations("status");
  return (
    <div
      role="status"
      aria-live="polite"
      className="border-line bg-surface flex h-[380px] flex-col justify-end gap-3 rounded-lg border p-4"
    >
      <span className="sr-only">{label ?? t("loading")}</span>
      <div aria-hidden="true" className="flex h-full animate-pulse items-end gap-2">
        {[40, 55, 48, 62, 58, 70, 66, 74, 69, 80, 76, 85].map((h, i) => (
          <div key={i} className="bg-surface-2 flex-1 rounded-t" style={{ height: `${h}%` }} />
        ))}
      </div>
      <p aria-hidden="true" className="text-ink-3 text-sm">
        {label ?? t("loading")}
      </p>
    </div>
  );
}

export function ErrorState({
  code,
  onRetry,
  retrying,
}: {
  code: SeriesErrorCode;
  onRetry?: () => void;
  retrying?: boolean;
}) {
  const t = useTranslations("status");
  return (
    <div role="alert" className="border-danger bg-danger-soft text-ink rounded-lg border p-5">
      <h3 className="flex items-center gap-2 font-semibold">
        <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" className="text-danger">
          <circle cx="10" cy="10" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M10 5v6M10 13.5v1.5" stroke="currentColor" strokeWidth="2" />
        </svg>
        {t(`errors.${code}.title`)}
      </h3>
      <p className="text-ink-2 mt-1 text-sm">{t(`errors.${code}.body`)}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="bg-accent-strong text-surface mt-4 min-h-11 rounded-md px-4 text-sm font-medium hover:opacity-90 disabled:opacity-60"
        >
          {t("retry")}
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div
      role="status"
      className="border-line bg-surface text-ink-2 grid min-h-48 place-items-center rounded-lg border border-dashed p-6 text-center"
    >
      <p className="max-w-md">{message}</p>
    </div>
  );
}
