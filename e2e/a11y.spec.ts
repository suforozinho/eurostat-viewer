import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/** Full axe scan in a real browser, colour contrast included, against WCAG 2.2 A/AA. */
async function expectNoViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
    .analyze();
  const summary = results.violations.map(
    (v) =>
      `${v.id} (${v.impact}): ${v.help}\n  ${v.nodes.map((n) => n.target.join(" ")).join("\n  ")}`,
  );
  expect(summary, summary.join("\n")).toEqual([]);
}

const views = [
  ["trend chart", "/en?countries=PT,ES,DE,FR,IT"],
  ["trend table", "/en?countries=PT,ES&display=table"],
  ["ranking chart", "/en?indicator=gdp-per-capita&view=ranking"],
  ["map", "/en?indicator=renewable-energy&view=map"],
  ["Portuguese trend", "/pt?indicator=life-expectancy"],
] as const;

for (const scheme of ["light", "dark"] as const) {
  test.describe(`${scheme} mode`, () => {
    test.use({ colorScheme: scheme });

    for (const [name, path] of views) {
      test(`${name} has no axe violations`, async ({ page }) => {
        await page.goto(path);
        await expect(page.getByRole("figure")).toBeVisible();
        if (path.includes("view=map"))
          await expect(page.getByRole("img", { name: /across Europe/ })).toBeVisible();
        await expectNoViolations(page);
      });
    }
  });
}
