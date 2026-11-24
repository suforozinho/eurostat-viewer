import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";
import { routing } from "./routing";

// The locale comes from the `[locale]` root segment via `next/root-params`, so
// pages stay statically renderable without reading request headers.
export default getRequestConfig(async ({ locale: override }) => {
  const requested = override ?? (await rootLocale());
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  return {
    locale,
    // Fixed so server and browser format dates identically.
    timeZone: "Europe/Brussels",
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
