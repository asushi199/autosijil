import { describe, expect, test } from "vitest";
import { isLibraryTemplate, isOwnedByEvent } from "./program-template";

describe("program-owned template helpers", () => {
  test("library templates have no owner_event_id", () => {
    expect(isLibraryTemplate({ owner_event_id: null })).toBe(true);
    expect(isLibraryTemplate({})).toBe(true);
    expect(isLibraryTemplate({ owner_event_id: "evt-1" })).toBe(false);
  });

  test("owned-by-event checks matching owner", () => {
    expect(isOwnedByEvent({ owner_event_id: "evt-1" }, "evt-1")).toBe(true);
    expect(isOwnedByEvent({ owner_event_id: "evt-1" }, "evt-2")).toBe(false);
    expect(isOwnedByEvent({ owner_event_id: null }, "evt-1")).toBe(false);
  });
});
