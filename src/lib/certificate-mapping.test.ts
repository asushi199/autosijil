import { describe, expect, it } from "vitest";
import { getIncompleteSlotLabels, mappedSlotValues } from "./certificate-mapping";
import type { FormField, Template } from "./types";

const template = {
  id: "template-1",
  name: "Templat",
  bg_image_path: null,
  orientation: "landscape",
  created_at: "2026-07-19T00:00:00.000Z",
  elements: [
    {
      id: "slot-element",
      source: "participant_slot",
      slotId: "unit_slot",
      slotLabel: "Jabatan / Sekolah",
      x: 0.5,
      y: 0.5,
      size: 16,
      font: "poppins",
      color: "#000000",
      align: "center",
    },
  ],
} as unknown as Template;

const fields = [
  { key: "unit", label: "Nama sekolah", type: "text", required: true, certificateEligible: true },
  { key: "multi", label: "Kursus", type: "checkboxes", required: false, options: ["AI"], certificateEligible: true },
] as unknown as FormField[];

describe("certificate field mapping", () => {
  it("requires a manual mapping for every template slot", () => {
    expect(getIncompleteSlotLabels(template, fields, {})).toEqual(["Jabatan / Sekolah"]);
  });

  it("rejects mapping a multiselect field into a certificate slot", () => {
    expect(getIncompleteSlotLabels(template, fields, { unit_slot: "multi" })).toEqual(["Jabatan / Sekolah"]);
  });

  it("resolves the mapped single-value answer for printing", () => {
    expect(mappedSlotValues(template, { unit_slot: "unit" }, { unit: "SK Seri Manjung" })).toEqual({
      unit_slot: "SK Seri Manjung",
    });
  });
});
