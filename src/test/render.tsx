import { render } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement } from "react";
import { vi } from "vitest";
import en from "../../messages/en.json";
import pt from "../../messages/pt.json";
import { makeQueryClient } from "@/components/QueryProvider";

/**
 * `next/navigation` stand-in that behaves like the real thing for this app:
 * `useSearchParams` follows `window.location`, including `history.pushState`.
 */
vi.mock("next/navigation", async () => {
  const { useSyncExternalStore } = await import("react");
  const listeners = new Set<() => void>();
  for (const method of ["pushState", "replaceState"] as const) {
    const original = window.history[method].bind(window.history);
    window.history[method] = (...args: Parameters<History["pushState"]>) => {
      original(...args);
      listeners.forEach((l) => l());
    };
  }
  window.addEventListener("popstate", () => listeners.forEach((l) => l()));
  const cache = new Map<string, URLSearchParams>();
  return {
    useSearchParams: () => {
      const search = useSyncExternalStore(
        (l) => (listeners.add(l), () => listeners.delete(l)),
        () => window.location.search,
      );
      if (!cache.has(search)) cache.set(search, new URLSearchParams(search));
      return cache.get(search)!;
    },
  };
});

export function renderWithProviders(
  ui: ReactElement,
  { locale = "en" }: { locale?: "en" | "pt" } = {},
) {
  const client = makeQueryClient();
  client.setDefaultOptions({ queries: { ...client.getDefaultOptions().queries, retry: false } });
  return render(
    <NextIntlClientProvider
      locale={locale}
      messages={locale === "pt" ? pt : en}
      timeZone="Europe/Brussels"
    >
      <QueryClientProvider client={client}>{ui}</QueryClientProvider>
    </NextIntlClientProvider>,
  );
}

/** Sets the URL the component under test will read. */
export function setUrl(query: string, path = "/en") {
  window.history.replaceState(null, "", `${path}${query ? `?${query}` : ""}`);
}
