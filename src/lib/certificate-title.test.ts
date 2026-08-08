import { describe, expect, test } from "vitest";
import { certificateEventName } from "./certificate-title";

describe("certificateEventName", () => {
  test("falls back to title when certificate_title is null or blank", () => {
    expect(certificateEventName({ title: "Program A", certificate_title: null })).toBe("Program A");
    expect(certificateEventName({ title: "Program A", certificate_title: "" })).toBe("Program A");
    expect(certificateEventName({ title: "Program A", certificate_title: "   " })).toBe("Program A");
    expect(certificateEventName({ title: "Program A" })).toBe("Program A");
  });

  test("preserves manual newlines in certificate_title", () => {
    const custom = "WORK COE: Penataran Modul\nPendigitalan Google, Canva dan AI";
    expect(
      certificateEventName({ title: "WORK COE: Penataran Modul Pendigitalan Google, Canva dan AI", certificate_title: custom }),
    ).toBe(custom);
  });

  test("preserves empty lines inside custom title", () => {
    const custom = "Baris satu\n\nBaris tiga";
    expect(certificateEventName({ title: "Fallback", certificate_title: custom })).toBe(custom);
  });
});
