import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

export default async function NotFound() {
  const t = await getTranslations("notFound");
  const locale = await getLocale();
  return (
    <main className="mx-auto grid min-h-dvh max-w-xl place-content-center gap-3 px-4 text-center">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <p className="text-ink-2">{t("body")}</p>
      <Link href={`/${locale}`} className="text-accent underline underline-offset-2">
        {t("home")}
      </Link>
    </main>
  );
}
