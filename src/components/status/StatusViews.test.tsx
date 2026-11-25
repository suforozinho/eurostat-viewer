import { afterEach, describe, expect, it, vi } from "vitest";
import { act, screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/render";
import { LoadingState } from "./StatusViews";

describe("LoadingState", () => {
  afterEach(() => vi.useRealTimers());

  it("explains a slow Eurostat response after a while", () => {
    vi.useFakeTimers();
    renderWithProviders(<LoadingState slowAfterMs={8000} />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading data from Eurostat");

    act(() => vi.advanceTimersByTime(7999));
    expect(screen.getByRole("status")).not.toHaveTextContent("longer than usual");

    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByRole("status")).toHaveTextContent("Eurostat is taking longer than usual");
  });

  it("never shows the slow message without a delay", () => {
    vi.useFakeTimers();
    renderWithProviders(<LoadingState label="Loading map…" />);
    act(() => vi.advanceTimersByTime(60_000));
    expect(screen.getByRole("status")).toHaveTextContent("Loading map…");
  });
});
