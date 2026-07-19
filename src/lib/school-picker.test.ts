import { describe, expect, it } from "vitest";
import { filterSchools } from "./school-picker";

const schools = [
  { code: "ABC1061", name: "SJKC AYER TAWAR", zone: "BERUAS" },
  { code: "AHA1002", name: "KOLEJ VOKASIONAL SERI MANJUNG", zone: "SITIAWAN" },
  { code: "ABA1001", name: "SK DENDANG", zone: "BERUAS" },
];

describe("filterSchools", () => {
  it("finds a school by code or name and keeps code order", () => {
    expect(filterSchools(schools, "aba10").map((school) => school.code)).toEqual(["ABA1001"]);
    expect(filterSchools(schools, "dendang").map((school) => school.code)).toEqual(["ABA1001"]);
    expect(filterSchools(schools, "").map((school) => school.code)).toEqual([
      "ABA1001",
      "ABC1061",
      "AHA1002",
    ]);
  });
});
