// @vitest-environment node
import { describe, expect, it } from "vitest";
import { countryName, formatAxisValue, formatDate, formatValue, parseEurostatDate } from "./format";

// Intl output can use narrow no-break spaces; compare with plain spaces.
const plain = (s: string | null) => s?.replace(/[  ]/g, " ");

describe("formatValue", () => {
  it("formats percentages per locale", () => {
    expect(plain(formatValue(6.42, "percent", 1, "en-GB"))).toBe("6.4%");
    expect(plain(formatValue(6.42, "percent", 1, "pt-PT"))).toBe("6,4%");
  });

  it("formats euros per locale", () => {
    expect(plain(formatValue(38650, "eur", 0, "en-GB"))).toBe("€38,650");
    expect(plain(formatValue(38650, "eur", 0, "pt-PT"))).toBe("38 650 €");
  });

  it("formats years with a translated unit", () => {
    expect(plain(formatValue(81.7, "years", 1, "en-GB"))).toBe("81.7 years");
    expect(plain(formatValue(81.7, "years", 1, "pt-PT"))).toBe("81,7 anos");
  });

  it("keeps negative values readable", () => {
    expect(plain(formatValue(-0.6, "percent", 1, "en-GB"))).toBe("-0.6%");
  });
});

describe("formatAxisValue", () => {
  it("uses compact euros", () => {
    expect(plain(formatAxisValue(40000, "eur", "en-GB"))).toBe("€40K");
  });
});

describe("Eurostat dates", () => {
  it("parses offsets without a colon", () => {
    expect(parseEurostatDate("2026-11-06T23:00:00+0100")?.toISOString()).toBe(
      "2026-11-06T22:00:00.000Z",
    );
    expect(parseEurostatDate("not a date")).toBeNull();
  });

  it("formats in the Brussels time zone", () => {
    expect(formatDate("2026-11-06T23:00:00+0100", "en-GB")).toBe("6 November 2026");
    expect(formatDate("2026-11-06T23:00:00+0100", "pt-PT")).toBe("6 de novembro de 2026");
  });
});

describe("countryName", () => {
  it("translates names with the browser's own data, using European Portuguese", () => {
    expect(countryName("DE", "pt-PT")).toBe("Alemanha");
    expect(countryName("PL", "pt-PT")).toBe("Polónia");
    expect(countryName("DE", "en-GB")).toBe("Germany");
  });

  it("maps Eurostat's own codes to ISO ones", () => {
    expect(countryName("EL", "en-GB")).toBe("Greece");
    expect(countryName("UK", "pt-PT")).toBe("Reino Unido");
  });

  it("adds Eurostat's footnote marker to Kosovo", () => {
    expect(countryName("XK", "en-GB")).toBe("Kosovo*");
  });

  it("falls back to Eurostat's label for codes Intl does not know", () => {
    expect(countryName("QQ", "en-GB", "Somewhere")).toBe("Somewhere");
  });
});
