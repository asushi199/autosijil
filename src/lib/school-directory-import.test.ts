import { describe, expect, it } from "vitest";
import { parseSchoolDirectoryCsv } from "./school-directory-import";

describe("parseSchoolDirectoryCsv", () => {
  it("parses the supplied directory format", () => {
    const csv = [
      "kod_sekolah,nama_sekolah,zon,kemaskini_terakhir,peranan_diisi",
      "ABA1001,SK DENDANG,BERUAS,2026-06-13T09:44:12.740Z,3/3",
    ].join("\n");

    expect(parseSchoolDirectoryCsv(csv)).toEqual([
      {
        code: "ABA1001",
        name: "SK DENDANG",
        zone: "BERUAS",
        source_updated_at: "2026-06-13T09:44:12.740Z",
      },
    ]);
  });

  it("accepts a UTF-8 BOM before the source header", () => {
    const csv = [
      "\uFEFFkod_sekolah,nama_sekolah,zon,kemaskini_terakhir,peranan_diisi",
      "ABA1001,SK DENDANG,BERUAS,2026-06-13T09:44:12.740Z,3/3",
    ].join("\n");

    expect(parseSchoolDirectoryCsv(csv)).toHaveLength(1);
  });

  it("rejects a row without a school code or name", () => {
    const csv = [
      "kod_sekolah,nama_sekolah,zon,kemaskini_terakhir,peranan_diisi",
      ",,BERUAS,2026-06-13T09:44:12.740Z,3/3",
    ].join("\n");

    expect(() => parseSchoolDirectoryCsv(csv)).toThrow("Kod atau nama sekolah tiada");
  });
});
