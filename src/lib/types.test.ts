import { describe, expect, test } from "vitest";

const types = (await import("./types")) as Record<string, unknown>;

describe("certificate editor options", () => {
  test("offers only reusable roles for newly configured form fields", () => {
    expect(types.CERTIFICATE_FIELD_ROLE_OPTIONS).toEqual(["name", "ic"]);
  });

  test("does not offer the legacy school source for new template elements", () => {
    expect(types.TEMPLATE_SOURCES_FOR_NEW_ELEMENTS).toEqual([
      "name",
      "ic",
      "event_name",
      "event_date",
      "event_location",
      "participant_slot",
      "static",
    ]);
  });
});
