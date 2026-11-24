import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Explorer } from "@/components/explorer/Explorer";
import { ExplorerSkeleton } from "@/components/explorer/ExplorerSkeleton";
import { LanguageSwitcher, LanguageSwitcherFallback } from "@/components/LanguageSwitcher";

/** Set NEXT_PUBLIC_REPO_URL (e.g. in Vercel) to show a link to the source code. */
const REPO_URL = process.env.NEXT_PUBLIC_REPO_URL;

/**
 * The page is a static shell (header, intro, footer) prerendered for each
 * language. The explorer reads the query string in the browser, inside a
 * Suspense boundary, so the shell is served instantly from the CDN.
 */
export default async function Home() {
  const t = await getTranslations();

  return (
    <>
      <a
        href="#explorer"
        className="bg-surface text-ink sr-only z-50 rounded-md px-4 py-2 font-medium shadow focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        {t("skipLink")}
      </a>

      <header className="border-line bg-surface border-b">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              {t("header.appName")}
            </h1>
            <p className="text-ink-2 text-sm">{t("header.tagline")}</p>
          </div>
          <Suspense fallback={<LanguageSwitcherFallback />}>
            <LanguageSwitcher />
          </Suspense>
        </div>
      </header>

      {/* At least one screen tall, so the footer never starts in view and jumps when data arrives. */}
      <main className="mx-auto min-h-dvh max-w-7xl px-4 py-6 sm:px-6">
        <Suspense fallback={<ExplorerSkeleton />}>
          <Explorer />
        </Suspense>
      </main>

      <footer className="border-line bg-surface text-ink-2 border-t text-sm">
        <div className="mx-auto max-w-7xl space-y-2 px-4 py-6 sm:px-6">
          <p>
            {t("footer.credit")}{" "}
            <a
              className="text-accent underline underline-offset-2"
              href="https://ec.europa.eu/eurostat/help/copyright-notice"
            >
              {t("footer.creditLink")}
            </a>
          </p>
          <p>{t("footer.boundaries")}</p>
          <p>{t("footer.kosovo")}</p>
          <p>
            {t("footer.about")}
            {REPO_URL ? (
              <>
                {" "}
                <a className="text-accent underline underline-offset-2" href={REPO_URL}>
                  {t("footer.code")}
                </a>
              </>
            ) : null}
          </p>
        </div>
      </footer>
    </>
  );
}
