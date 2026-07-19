import { describe, expect, it } from "vitest";
import { formatFormValue, validateSubmission } from "./form-submission";
import type { FormField } from "./types";

const fields = [
  { key: "nama", label: "Nama", type: "text", required: true, role: "name" },
  { key: "ic", label: "No. Kad Pengenalan", type: "ic", required: true, role: "ic" },
  {
    key: "jawatan",
    label: "Jawatan",
    type: "select",
    required: true,
    options: ["Guru", "Pentadbir"],
    certificateEligible: true,
  },
  { key: "kursus", label: "Kursus", type: "checkboxes", required: false, options: ["AI", "Canva"] },
] as unknown as FormField[];

describe("validateSubmission", () => {
  it("accepts exact options, arrays, and a 12 digit IC", () => {
    expect(
      validateSubmission(fields, {
        nama: " Ali ",
        ic: "900101081234",
        jawatan: "Guru",
        kursus: ["AI"],
      }),
    ).toEqual({
      data: { nama: "Ali", ic: "900101081234", jawatan: "Guru", kursus: ["AI"] },
      name: "Ali",
      ic: "900101081234",
    });
  });

  it("rejects IC values containing hyphens", () => {
    expect(
      validateSubmission(fields, { nama: "Ali", ic: "900101-08-1234", jawatan: "Guru" }),
    ).toEqual({ error: "No. Kad Pengenalan mesti mengandungi tepat 12 digit tanpa sengkang." });
  });

  it("rejects values outside configured options", () => {
    expect(validateSubmission(fields, { nama: "Ali", ic: "900101081234", jawatan: "Lain" })).toEqual({
      error: "Pilihan bagi medan \"Jawatan\" tidak sah.",
    });
  });

  it("requires a selected multiselect value when required", () => {
    const requiredMulti = [
      { key: "kumpulan", label: "Kumpulan", type: "checkboxes", required: true, options: ["A", "B"] },
    ] as unknown as FormField[];
    expect(validateSubmission(requiredMulti, { kumpulan: [] })).toEqual({
      error: "Medan \"Kumpulan\" wajib diisi.",
    });
  });

  it("accepts ISO dates and rejects malformed dates", () => {
    const dateField = [
      { key: "nama", label: "Nama", type: "text", required: true, role: "name" },
      { key: "tarikh", label: "Tarikh Lahir", type: "date", required: true },
    ] as unknown as FormField[];
    expect(validateSubmission(dateField, { nama: "Ali", tarikh: "2026-07-19" })).not.toHaveProperty("error");
    expect(validateSubmission(dateField, { nama: "Ali", tarikh: "19/07/2026" })).toEqual({
      error: "Tarikh bagi medan \"Tarikh Lahir\" tidak sah.",
    });
  });

  it("accepts only school codes present in the directory", () => {
    const schoolFields: FormField[] = [
      { key: "nama", label: "Nama", type: "text", required: true, role: "name" },
      { key: "sekolah", label: "Sekolah", type: "school", required: true, role: "school" },
    ];

    expect(
      validateSubmission(schoolFields, { nama: "Ali", sekolah: "ABA1001" }, new Set(["ABA1001"])),
    ).toMatchObject({ data: { sekolah: "ABA1001" } });
    expect(
      validateSubmission(schoolFields, { nama: "Ali", sekolah: "SALAH" }, new Set(["ABA1001"])),
    ).toEqual({ error: 'Pilihan bagi medan "Sekolah" tidak sah.' });
  });

  it("formats multiselect values for tables and CSV", () => {
    expect(formatFormValue(["AI", "Canva"])).toBe("AI, Canva");
  });
});
