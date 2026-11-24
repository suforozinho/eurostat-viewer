import { expect, test } from "@playwright/test";

test("pick an indicator, add two countries, switch language, reload from the URL", async ({
  page,
  browser,
}) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/en$/);

  // Pick an indicator.
  await page.getByRole("radio", { name: "Internet use" }).check();
  await expect(page.getByRole("heading", { name: /^Internet use, \d{4}–\d{4}$/ })).toBeVisible();

  // Add two countries to the default three.
  const add = page.getByLabel("Add a country");
  await add.selectOption({ label: "Finland" });
  await add.selectOption({ label: "Ireland" });
  const legend = page.getByRole("list", { name: "Legend" });
  await expect(legend.getByRole("listitem")).toHaveText([
    "Portugal",
    "Spain",
    "Germany",
    "Finland",
    "Ireland",
  ]);
  await expect(page).toHaveURL(/indicator=internet-use&countries=PT,ES,DE,FI,IE/);

  // Switch language: same view, Portuguese interface.
  await page.getByRole("link", { name: "Ver em português" }).click();
  await expect(page).toHaveURL(/\/pt\?indicator=internet-use&countries=PT,ES,DE,FI,IE/);
  await expect(
    page.getByRole("heading", { name: /^Utilização da internet, \d{4}–\d{4}$/ }),
  ).toBeVisible();
  const legendPt = page.getByRole("list", { name: "Legenda" });
  await expect(legendPt.getByRole("listitem")).toHaveText([
    "Portugal",
    "Espanha",
    "Alemanha",
    "Finlândia",
    "Irlanda",
  ]);
  await expect(page.locator("html")).toHaveAttribute("lang", "pt-PT");

  // Reload: the URL alone restores the view.
  await page.reload();
  await expect(legendPt.getByRole("listitem")).toHaveCount(5);
  await expect(page.getByRole("radio", { name: "Utilização da internet" })).toBeChecked();

  // A fresh browser with only the link shows the same view.
  const fresh = await browser.newPage();
  await fresh.goto(page.url());
  await expect(fresh.getByRole("heading", { name: /^Utilização da internet, / })).toBeVisible();
  await expect(fresh.getByRole("list", { name: "Legenda" }).getByRole("listitem")).toHaveCount(5);
  await fresh.close();
});

test("the back button undoes view changes", async ({ page }) => {
  await page.goto("/en?indicator=unemployment&countries=PT,ES");
  await page.getByRole("tab", { name: "Ranking" }).click();
  await expect(page.getByRole("heading", { name: /Unemployment rate by country/ })).toBeVisible();
  await page.getByRole("radio", { name: "Inflation (HICP)" }).check();
  await expect(page.getByRole("heading", { name: /Inflation \(HICP\) by country/ })).toBeVisible();

  await page.goBack();
  await expect(page.getByRole("heading", { name: /Unemployment rate by country/ })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("heading", { name: /^Unemployment rate, / })).toBeVisible();
});

test("the map loads on demand and has a text alternative", async ({ page }) => {
  await page.goto("/en?indicator=renewable-energy&countries=PT,SE");
  await expect(page.getByRole("list", { name: "Legend" })).toBeVisible();
  await expect(page.getByRole("img", { name: /across Europe/ })).toHaveCount(0);

  await page.getByRole("tab", { name: "Map" }).click();
  const map = page.getByRole("img", { name: /Renewable energy share across Europe, \d{4}/ });
  await expect(map).toBeVisible();
  await expect(page.getByText("No data", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Table" }).click();
  await expect(
    page.getByRole("table", { name: /Renewable energy share by country/ }),
  ).toBeVisible();
});

test("everything works with the keyboard alone", async ({ page }) => {
  await page.goto("/en?countries=PT");
  await expect(page.getByRole("list", { name: "Legend" })).toBeVisible();

  // Skip link is the first stop and jumps to the explorer.
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to the chart" })).toBeFocused();

  // Indicator radios respond to arrow keys.
  await page.getByRole("radio", { name: "Unemployment rate" }).focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("radio", { name: "GDP per capita" })).toBeChecked();

  // Add a country with the keyboard.
  await page.getByLabel("Add a country").focus();
  await page.getByLabel("Add a country").selectOption({ label: "Austria" });
  await expect(page).toHaveURL(/countries=PT,AT/);

  // Tabs: arrow keys switch views.
  await page.getByRole("tab", { name: "Over time" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Ranking" })).toHaveAttribute("aria-selected", "true");

  // Table toggle.
  await page.getByRole("button", { name: "Table" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("table")).toBeVisible();
});

test("an unknown indicator in the URL falls back to a working view", async ({ page }) => {
  await page.goto("/en?indicator=does-not-exist&countries=PT");
  await expect(page.getByRole("heading", { name: /^Unemployment rate, / })).toBeVisible();
});

test("the API rejects unknown indicators", async ({ request }) => {
  const res = await request.get("/api/series?indicator=nope");
  expect(res.status()).toBe(400);
  expect(await res.json()).toEqual({ error: { code: "invalid_indicator" } });
});
