import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "pt"],
  defaultLocale: "en",
  // Language is always in the path (/en, /pt), so a copied link keeps it.
  localePrefix: "always",
});

export type AppLocale = (typeof routing.locales)[number];

/**
 * BCP 47 tags used for number formatting and country names. Portuguese uses
 * European Portuguese (pt-PT): "Estónia", "Polónia", not the Brazilian forms.
 */
export const INTL_LOCALE: Record<AppLocale, string> = {
  en: "en-GB",
  pt: "pt-PT",
};
