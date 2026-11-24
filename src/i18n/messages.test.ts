// @vitest-environment node
import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import pt from "../../messages/pt.json";
import { INDICATORS } from "@/lib/indicators";
import { SERIES_ERROR_CODES } from "@/lib/eurostat/errors";

type Tree = { [key: string]: string | Tree };

function keys(tree: Tree, prefix = ""): string[] {
  return Object.entries(tree).flatMap(([k, v]) =>
    typeof v === "string" ? [`${prefix}${k}`] : keys(v, `${prefix}${k}.`),
  );
}

function placeholders(text: string): string[] {
  // Top-level ICU arguments only, e.g. {count} and {count, plural, …}.
  return [...text.matchAll(/\{(\w+)[,}]/g)].map((m) => m[1]).sort();
}

function lookup(tree: Tree, path: string): string {
  return path.split(".").reduce<string | Tree>((node, k) => (node as Tree)[k], tree) as string;
}

describe("translations", () => {
  it("Portuguese has exactly the same keys as English", () => {
    expect(keys(pt).sort()).toEqual(keys(en).sort());
  });

  it("uses the same placeholders in both languages", () => {
    for (const key of keys(en)) {
      expect(placeholders(lookup(pt, key)), key).toEqual(placeholders(lookup(en, key)));
    }
  });

  it("has a name and description for every indicator, in both languages", () => {
    for (const { id } of INDICATORS) {
      for (const messages of [en, pt] as Tree[]) {
        expect(lookup(messages, `indicators.${id}.name`)).toBeTruthy();
        expect(lookup(messages, `indicators.${id}.description`)).toBeTruthy();
      }
    }
  });

  it("has a title and body for every error code, in both languages", () => {
    for (const code of SERIES_ERROR_CODES) {
      for (const messages of [en, pt] as Tree[]) {
        expect(lookup(messages, `status.errors.${code}.title`)).toBeTruthy();
        expect(lookup(messages, `status.errors.${code}.body`)).toBeTruthy();
      }
    }
  });

  it("actually translates: no Portuguese string is left identical to English, except names", () => {
    const allowedSame = new Set([
      "header.switchTo",
      "header.switchToLabel",
      "indicators.gdp-per-capita.name",
      "source.eurostat",
      "chart.trendTitle",
    ]);
    const same = keys(en).filter((k) => !allowedSame.has(k) && lookup(en, k) === lookup(pt, k));
    expect(same).toEqual([]);
  });
});
