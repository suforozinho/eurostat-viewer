import { useTranslations } from "next-intl";

/**
 * Server-rendered placeholder shown in the static HTML until the explorer
 * hydrates. It has the same layout as the real thing, so nothing shifts.
 */
export function ExplorerSkeleton() {
  const t = useTranslations("status");
  return (
    <div className="grid gap-6 lg:grid-cols-[19rem_minmax(0,1fr)]" aria-busy="true">
      <p className="sr-only" role="status">
        {t("loading")}
      </p>
      <div aria-hidden="true" className="space-y-1.5">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="border-line bg-surface h-11 rounded-md border" />
        ))}
      </div>
      <div aria-hidden="true">
        <div className="bg-surface-2 mb-2 h-8 w-64 rounded" />
        <div className="bg-surface-2 mb-6 h-5 w-full max-w-xl rounded" />
        <div className="border-line bg-surface h-[420px] rounded-lg border" />
      </div>
    </div>
  );
}
