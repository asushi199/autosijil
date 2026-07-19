import { describe, expect, it } from "vitest";
import { suggestCertificateNames } from "./certificate-search";

describe("suggestCertificateNames", () => {
  const names = [
    "Ahmad Danial bin Abdullah",
    "Aisyah Dania",
    "Nur Danial",
    "Ali Bakar",
    "Ahmad Danial bin Abdullah",
    "Danial 01",
    "Danial 02",
    "Danial 03",
    "Danial 04",
    "Danial 05",
    "Danial 06",
    "Danial 07",
  ];

  it("matches name fragments without case sensitivity and limits results", () => {
    expect(suggestCertificateNames(names, "DANIAL")).toEqual([
      "Ahmad Danial bin Abdullah",
      "Danial 01",
      "Danial 02",
      "Danial 03",
      "Danial 04",
      "Danial 05",
      "Danial 06",
      "Danial 07",
    ]);
  });

  it("returns nothing before three characters", () => {
    expect(suggestCertificateNames(names, "Da")).toEqual([]);
  });
});
