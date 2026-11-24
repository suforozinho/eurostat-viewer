import { describe, expect, it } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/render";
import { expectNoAxeViolations } from "@/test/axe";
import { TrendChart } from "./TrendChart";
import { RankingChart } from "./RankingChart";

const format = (v: number) => `${v.toFixed(1)}%`;
const series = [
  { code: "PT", name: "Portugal", slot: 0 },
  { code: "ES", name: "Spain", slot: 1 },
];
const rows = [
  { year: 2021, PT: 6.6, ES: 14.8 },
  { year: 2022, PT: 6.1, ES: null },
  { year: 2023, PT: 6.5, ES: 12.1 },
];

function renderTrend() {
  return renderWithProviders(
    <TrendChart
      rows={rows}
      series={series}
      formatValue={format}
      formatAxis={format}
      flagOf={(c, y) => (c === "PT" && y === 2023 ? "p" : null)}
      endLabels
      summary="Line chart comparing Portugal and Spain"
      width={640}
    />,
  );
}

describe("TrendChart", () => {
  it("draws one line per country, with a gap for the missing year", () => {
    const { container } = renderTrend();
    const paths = [...container.querySelectorAll("path")].map((p) => p.getAttribute("d"));
    expect(paths).toHaveLength(2);
    // Spain has no 2022 value, so its line is two separate segments.
    expect(paths[1]!.match(/M/g)).toHaveLength(2);
  });

  it("labels the end of each line", () => {
    const { container } = renderTrend();
    const labels = [...container.querySelectorAll("svg text")].map((t) => t.textContent);
    expect(labels).toContain("Portugal");
    expect(labels).toContain("Spain");
  });

  it("is a named, focusable group with a keyboard hint", () => {
    renderTrend();
    const chart = screen.getByRole("group", { name: "Line chart comparing Portugal and Spain" });
    expect(chart).toHaveAttribute("tabindex", "0");
    expect(chart).toHaveAccessibleDescription(/arrow keys/);
  });

  it("reads values year by year with the arrow keys", () => {
    renderTrend();
    const chart = screen.getByRole("group");
    chart.focus();
    fireEvent.keyDown(chart, { key: "ArrowLeft" }); // first press shows the latest year
    expect(screen.getByText("2023: Spain 12.1%, Portugal 6.5%")).toBeInTheDocument();
    fireEvent.keyDown(chart, { key: "ArrowLeft" });
    expect(screen.getByText("2022: Portugal 6.1%")).toBeInTheDocument();
    fireEvent.keyDown(chart, { key: "Home" });
    expect(screen.getByText("2021: Spain 14.8%, Portugal 6.6%")).toBeInTheDocument();
  });

  it("shows Eurostat flags in the tooltip", () => {
    renderTrend();
    const chart = screen.getByRole("group");
    fireEvent.keyDown(chart, { key: "End" });
    fireEvent.keyDown(chart, { key: "End" });
    expect(screen.getByText("(provisional)")).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = renderTrend();
    await expectNoAxeViolations(container);
  });
});

describe("RankingChart", () => {
  const ranking = [
    { code: "ES", value: 12.1, flag: null },
    { code: "PT", value: 6.5, flag: "p" },
    { code: "DE", value: -0.4, flag: null },
  ];

  function renderRanking() {
    return renderWithProviders(
      <RankingChart
        rows={ranking}
        nameOf={(c) => ({ ES: "Spain", PT: "Portugal", DE: "Germany" })[c]!}
        slots={{ PT: 0 }}
        formatValue={format}
        formatAxis={format}
        summary="Bar chart of 3 countries"
        width={600}
      />,
    );
  }

  it("draws one bar per country, highest first, and marks compared countries", () => {
    const { container } = renderRanking();
    expect(container.querySelectorAll("path")).toHaveLength(3);
    const labels = [...container.querySelectorAll("svg text")].map((t) => t.textContent);
    expect(labels).toEqual(expect.arrayContaining(["Spain", "◆ Portugal", "Germany", "-0.4%"]));
  });

  it("reads countries in rank order with the arrow keys", () => {
    renderRanking();
    const chart = screen.getByRole("group", { name: "Bar chart of 3 countries" });
    fireEvent.keyDown(chart, { key: "ArrowDown" });
    expect(screen.getByText("1. Spain: 12.1%")).toBeInTheDocument();
    fireEvent.keyDown(chart, { key: "ArrowDown" });
    expect(screen.getByText("2. Portugal: 6.5% (provisional)")).toBeInTheDocument();
    fireEvent.keyDown(chart, { key: "End" });
    expect(screen.getByText("3. Germany: -0.4%")).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = renderRanking();
    await expectNoAxeViolations(container);
  });
});
