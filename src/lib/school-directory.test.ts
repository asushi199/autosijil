import { describe, expect, it } from "vitest";
import type { FormField } from "./types";
import { formatFieldValue, schoolLabelForCode, schoolOptionLabel } from "./school-directory";

const schools = [{ code: "ABA1001", name: "SK DENDANG", zone: "BERUAS" }];

describe("school directory labels", () => {
  it("formats a school option as its code and name", () => {
    expect(schoolOptionLabel(schools[0])).toBe("ABA1001 — SK DENDANG");
  });

  it("resolves a stored school code and leaves unknown codes unchanged", () => {
    expect(schoolLabelForCode("ABA1001", schools)).toBe("ABA1001 — SK DENDANG");
    expect(schoolLabelForCode("UNKNOWN", schools)).toBe("UNKNOWN");
  });

  it("formats only school fields with the directory label", () => {
    const schoolField: FormField = { key: "sekolah", label: "Sekolah", type: "school", required: true };
    const textField: FormField = { key: "kursus", label: "Kursus", type: "text", required: false };

    expect(formatFieldValue(schoolField, "ABA1001", schools)).toBe("ABA1001 — SK DENDANG");
    expect(formatFieldValue(textField, ["AI", "Canva"], schools)).toBe("AI, Canva");
  });
});
