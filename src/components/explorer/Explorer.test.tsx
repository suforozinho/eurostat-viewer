import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFixture } from "@/test/fixtures";
import { renderWithProviders, setUrl } from "@/test/render";
import { expectNoAxeViolations } from "@/test/axe";
import { loadSeries } from "@/lib/series/load";
import type { IndicatorId } from "@/lib/indicators";
import { Explorer } from "./Explorer";

/** Real payloads built from the saved Eurostat fixtures, through the real parser. */
async function payloadFor(id: IndicatorId) {
  const body = JSON.stringify(readFixture(id));
  return loadSeries(id, { fetchImpl: async () => new Response(body) });
}

function mockApi(handler: (indicator: string) => Promise<Response>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input), "http://localhost");
    return handler(url.searchParams.get("indicator") ?? "");
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const ok = async (indicator: string) => Response.json(await payloadFor(indicator as IndicatorId));

describe("Explorer", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    setUrl("");
  });

  it("shows a loading state, then the indicator with its default countries", async () => {
    mockApi(ok);
    renderWithProviders(<Explorer />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading data from Eurostat");
    expect(
      await screen.findByRole("heading", { name: /Unemployment rate, \d{4}–\d{4}/ }),
    ).toBeVisible();
    const legend = screen.getByRole("list", { name: "Legend" });
    expect(within(legend).getByText("Portugal")).toBeVisible();
    expect(within(legend).getByText("Spain")).toBeVisible();
    expect(within(legend).getByText("Germany")).toBeVisible();
  });

  it("restores the exact view from the URL", async () => {
    mockApi(ok);
    setUrl("indicator=life-expectancy&countries=FI,IE&from=2015&to=2020&display=table");
    renderWithProviders(<Explorer />);

    const table = await screen.findByRole("table", { name: /Life expectancy at birth, 2015–2020/ });
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((h) => h.textContent),
    ).toEqual(["Year", "Finland", "Ireland"]);
    expect(
      within(table)
        .getAllByRole("rowheader")
        .map((h) => h.textContent),
    ).toEqual(["2020", "2019", "2018", "2017", "2016", "2015"]);
    expect(screen.getByRole("radio", { name: "Life expectancy at birth" })).toBeChecked();
  });

  it("writes every change to the URL, as a new history entry", async () => {
    mockApi(ok);
    const user = userEvent.setup();
    renderWithProviders(<Explorer />);
    await screen.findByRole("list", { name: "Legend" });

    await user.click(screen.getByRole("radio", { name: "GDP per capita" }));
    expect(window.location.search).toContain("indicator=gdp-per-capita");

    await user.selectOptions(screen.getByLabelText("Add a country"), "Ireland");
    expect(new URLSearchParams(window.location.search).get("countries")).toBe("PT,ES,DE,IE");

    await user.click(screen.getByRole("button", { name: "Remove Spain" }));
    expect(new URLSearchParams(window.location.search).get("countries")).toBe("PT,DE,IE");

    await user.click(screen.getByRole("tab", { name: "Ranking" }));
    expect(window.location.search).toContain("view=ranking");
    expect(await screen.findByRole("heading", { name: /GDP per capita by country/ })).toBeVisible();
  });

  it("caps the comparison at five countries", async () => {
    mockApi(ok);
    setUrl("countries=PT,ES,DE,FR,IT");
    renderWithProviders(<Explorer />);
    await screen.findByRole("list", { name: "Legend" });

    expect(screen.getByText(/the maximum/)).toBeVisible();
    expect(screen.getByRole("option", { name: "Ireland" })).toBeDisabled();
  });

  it("explains an empty selection instead of drawing an empty chart", async () => {
    mockApi(ok);
    setUrl("countries=");
    renderWithProviders(<Explorer />);
    expect(await screen.findByText(/Add at least one country/)).toBeVisible();
  });

  it("says which selected countries have no data", async () => {
    mockApi(ok);
    // Liechtenstein is not in the unemployment dataset.
    setUrl("countries=PT,LI");
    renderWithProviders(<Explorer />);
    expect(await screen.findByText(/No data in this period for: Liechtenstein/)).toBeVisible();
  });

  it("shows a friendly error with a retry button when Eurostat fails", async () => {
    let fail = true;
    const fetchMock = mockApi(async (indicator) =>
      fail ? Response.json({ error: { code: "upstream" } }, { status: 502 }) : ok(indicator),
    );
    const user = userEvent.setup();
    renderWithProviders(<Explorer />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Eurostat is having problems");
    fail = false;
    await user.click(within(alert).getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("list", { name: "Legend" })).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["no_data", 404, "Eurostat has no data for this indicator"],
    ["timeout", 504, "Eurostat is taking too long to answer"],
    ["not_found", 404, "Eurostat could not find this dataset"],
  ])("maps the %s error to a clear message", async (code, status, message) => {
    mockApi(async () => Response.json({ error: { code } }, { status }));
    renderWithProviders(<Explorer />);
    expect(await screen.findByRole("alert")).toHaveTextContent(message);
  });

  it("treats an unexpected response shape as malformed", async () => {
    mockApi(async () => Response.json({ hello: "world" }));
    renderWithProviders(<Explorer />);
    expect(await screen.findByRole("alert")).toHaveTextContent("unexpected format");
  });

  it("reports a network failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Promise.reject(new TypeError("offline"))),
    );
    renderWithProviders(<Explorer />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not reach the data service");
  });

  it("renders in Portuguese with Portuguese number formats and country names", async () => {
    mockApi(ok);
    setUrl("indicator=life-expectancy&countries=PT,PL&from=2023&to=2023&display=table", "/pt");
    renderWithProviders(<Explorer />, { locale: "pt" });

    const table = await screen.findByRole("table");
    expect(within(table).getByRole("columnheader", { name: /Polónia/ })).toBeVisible();
    expect(within(table).getAllByRole("cell")[0].textContent).toMatch(/^\d{2},\d anos/);
    expect(screen.getByRole("tab", { name: "Ao longo do tempo" })).toBeVisible();
  });

  it("supports keyboard navigation between view tabs", async () => {
    mockApi(ok);
    const user = userEvent.setup();
    renderWithProviders(<Explorer />);
    await screen.findByRole("list", { name: "Legend" });

    screen.getByRole("tab", { name: "Over time" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Ranking" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "Ranking" })).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{End}");
    expect(screen.getByRole("tab", { name: "Map" })).toHaveFocus();
    await user.keyboard("{Home}");
    expect(screen.getByRole("tab", { name: "Over time" })).toHaveFocus();
  });

  describe("accessibility (axe)", () => {
    it("has no violations while loading", async () => {
      mockApi(() => new Promise(() => {}));
      const { container } = renderWithProviders(<Explorer />);
      await expectNoAxeViolations(container);
    });

    it("has no violations in the trend table view", async () => {
      mockApi(ok);
      setUrl("display=table");
      const { container } = renderWithProviders(<Explorer />);
      await screen.findByRole("table");
      await expectNoAxeViolations(container);
    });

    it("has no violations in the ranking table view", async () => {
      mockApi(ok);
      setUrl("view=ranking&display=table");
      const { container } = renderWithProviders(<Explorer />);
      await screen.findByRole("table");
      await expectNoAxeViolations(container);
    });

    it("has no violations in the error state", async () => {
      mockApi(async () => Response.json({ error: { code: "upstream" } }, { status: 502 }));
      const { container } = renderWithProviders(<Explorer />);
      await screen.findByRole("alert");
      await expectNoAxeViolations(container);
    });

    it("has no violations in Portuguese", async () => {
      mockApi(ok);
      setUrl("display=table", "/pt");
      const { container } = renderWithProviders(<Explorer />, { locale: "pt" });
      await waitFor(() => expect(screen.getByRole("table")).toBeVisible());
      await expectNoAxeViolations(container);
    });
  });
});
