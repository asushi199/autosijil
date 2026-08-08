import { describe, expect, test } from "vitest";
import { certificateEventName } from "./certificate-title";

describe("certificateEventName", () => {
  test("falls back to title when certificate_title is null or blank", () => {
    expect(certificateEventName({ title: "Program A", certificate_title: null })).toBe("Program A");
    expect(certificateEventName({ title: "Program A", certificate_title: "" })).toBe("Program A");
    expect(certificateEventName({ title: "Program A", certificate_title: "   " })).toBe("Program A");
    expect(certificateEventName({ title: "Program A" })).toBe("Program A");
  });

  test("preserves manual newlines and empty lines", () => {
    const custom = "Baris satu\n\nBaris tiga";
    expect(certificateEventName({ title: "Fallback", certificate_title: custom })).toBe(custom);
  });
});
