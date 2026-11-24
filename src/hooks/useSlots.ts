"use client";

import { useState } from "react";
import { assignSlots } from "@/lib/derive";
import { SERIES_COUNT } from "@/components/charts/series";

/**
 * Palette slot per selected country. A country keeps its color while it stays
 * selected, so removing one country never repaints the others.
 */
export function useSlots(countries: string[]): Record<string, number> {
  const key = countries.join(",");
  const [state, setState] = useState(() => ({
    key,
    slots: assignSlots({}, countries, SERIES_COUNT),
  }));
  if (state.key !== key) {
    const next = { key, slots: assignSlots(state.slots, countries, SERIES_COUNT) };
    setState(next);
    return next.slots;
  }
  return state.slots;
}
