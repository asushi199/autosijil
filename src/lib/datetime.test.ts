import { describe, expect, test } from "vitest";
import { formatMalaysiaDateTime } from "./datetime";

describe("formatMalaysiaDateTime", () => {
  test("converts UTC timestamps to Malaysia time (GMT+8)", () => {
    // 00:30 UTC = 08:30 MYT
    const out = formatMalaysiaDateTime("2026-11-02T00:30:15Z");
    expect(out).toContain("02/11/2026");
    expect(out).toMatch(/08:30:15/);
    expect(out.toLowerCase()).toMatch(/pg|am/);
  });

  test("rolls over to the next day in Malaysia", () => {
    // 17:00 UTC on 1 Nov = 01:00 MYT on 2 Nov
    expect(formatMalaysiaDateTime("2026-11-01T17:00:00Z")).toContain("02/11/2026");
  });

  test("returns empty string for invalid input", () => {
    expect(formatMalaysiaDateTime("bukan tarikh")).toBe("");
  });
});
