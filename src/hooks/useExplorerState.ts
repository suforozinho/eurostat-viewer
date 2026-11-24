"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import { parseState, serializeState, type ExplorerState } from "@/lib/url-state";

export type UpdateState = (patch: Partial<ExplorerState>, options?: { replace?: boolean }) => void;

function readLocation(): ExplorerState {
  return parseState(new URLSearchParams(window.location.search));
}

/**
 * Reads the view from the URL and writes changes back to it.
 *
 * Uses the native History API: Next.js keeps `useSearchParams` in sync with
 * `pushState`/`replaceState`, and there is no server round trip, because the
 * page itself never changes, only the data it shows. Every change is a new
 * history entry, so the back button undoes it.
 *
 * A change shows immediately (optimistic state) even in the rare case where
 * the URL write has to wait for the router; see `whenRouterReady`.
 */
export function useExplorerState(): [ExplorerState, UpdateState] {
  const searchParams = useSearchParams();
  const urlState = useMemo(() => parseState(searchParams), [searchParams]);
  const urlKey = serializeState(urlState);

  // The newest state not yet written to the URL. Later updates build on it,
  // so quick successive changes are never lost.
  const pending = useRef<ExplorerState | null>(null);
  // Shown until the URL it was based on changes, i.e. until the write lands
  // (or the user navigates with the back button).
  const [optimistic, setOptimistic] = useState<{ base: string; state: ExplorerState } | null>(null);

  const update = useCallback<UpdateState>((patch, { replace = false } = {}) => {
    const next = { ...(pending.current ?? readLocation()), ...patch };
    pending.current = next;
    setOptimistic({ base: serializeState(readLocation()), state: next });
    whenRouterReady(() => {
      const url = `${window.location.pathname}?${serializeState(next)}`;
      if (replace) window.history.replaceState(null, "", url);
      else window.history.pushState(null, "", url);
      if (pending.current === next) pending.current = null;
    });
  }, []);

  // Once the URL moves on from the optimistic state's base, the write has
  // landed (or the user navigated), so drop it. Otherwise pressing Back to
  // that same URL later would show the stale optimistic state again.
  if (optimistic && optimistic.base !== urlKey) setOptimistic(null);

  const state = optimistic && optimistic.base === urlKey ? optimistic.state : urlState;
  return [state, update];
}

/**
 * Next.js learns about native history changes by wrapping
 * `history.pushState` in an effect that runs after hydration. A write that
 * happens before that would change the address bar without updating
 * `useSearchParams`. The wrapper is an own property of `window.history` (the
 * native method lives on the prototype), so wait for it, briefly, first.
 */
function whenRouterReady(run: () => void, attemptsLeft = 50) {
  if (Object.hasOwn(window.history, "pushState") || attemptsLeft === 0) run();
  else setTimeout(() => whenRouterReady(run, attemptsLeft - 1), 20);
}
