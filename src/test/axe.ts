import axe from "axe-core";
import { expect } from "vitest";

/**
 * Runs axe-core on a rendered container and fails with a readable list of
 * violations. Color contrast is skipped because jsdom does not compute styles;
 * the Playwright suite checks contrast in a real browser.
 */
export async function expectNoAxeViolations(container: Element) {
  const results = await axe.run(container, {
    rules: { "color-contrast": { enabled: false } },
  });
  const summary = results.violations.map(
    (v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(" ")).join(", ")})`,
  );
  expect(summary).toEqual([]);
}
