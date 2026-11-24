"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { isRetryable } from "@/lib/series/fetch-series";

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // The server caches for hours; within a visit, data never goes stale.
        staleTime: 60 * 60 * 1000,
        gcTime: 6 * 60 * 60 * 1000,
        refetchOnWindowFocus: false,
        // Retry once for temporary failures; never for "no data" or "not found".
        retry: (failureCount, error) => isRetryable(error) && failureCount < 1,
      },
    },
  });
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(makeQueryClient);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
