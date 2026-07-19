import { describe, expect, it } from "vitest";

import { normalizeFormFieldsForSave, parseOptionsWhileEditing } from "./form-fields";

describe("parseOptionsWhileEditing", () => {
  it("keeps spaces within an option while removing separator spacing", () => {
    expect(parseOptionsWhileEditing("PKG SITIAWAN, SMK Seri Manjung")).toEqual([
      "PKG SITIAWAN",
      "SMK Seri Manjung",
    ]);
  });
});

describe("normalizeFormFieldsForSave", () => {
  it("removes only outer whitespace from saved options", () => {
    expect(
      normalizeFormFieldsForSave([
        {
          key: "tempat",
          label: "Tempat Kursus",
          type: "select",
          required: false,
          options: ["PKG SITIAWAN ", " SMK Seri Manjung", ""],
        },
      ]),
    ).toMatchObject([
      { options: ["PKG SITIAWAN", "SMK Seri Manjung"] },
    ]);
  });
});
