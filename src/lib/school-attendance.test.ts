import { describe, expect, it } from "vitest";
import {
  buildSchoolAttendanceRows,
  formatPkgAttendanceCopy,
  groupSchoolAttendanceByPkg,
  pkgGroupLabel,
} from "./school-attendance";
import type { Attendee } from "./types";

const schools = [
  { code: "AAA1001", name: "SK SATU", zone: "Zon A" },
  { code: "AAA1002", name: "SK DUA", zone: "Zon B" },
];

function attendee(id: string, school: unknown): Attendee {
  return {
    id,
    event_id: "event-1",
    name_value: `Peserta ${id}`,
    ic_value: null,
    data: { sekolah: school as string },
    created_at: "2026-08-24T00:00:00.000Z",
  };
}

describe("buildSchoolAttendanceRows", () => {
  it("counts attendees for every school and keeps schools with no attendance", () => {
    expect(
      buildSchoolAttendanceRows(
        schools,
        [attendee("1", "AAA1001"), attendee("2", "AAA1001")],
        "sekolah",
      ),
    ).toEqual([
      { ...schools[0], attendeeCount: 2 },
      { ...schools[1], attendeeCount: 0 },
    ]);
  });

  it("ignores missing, non-string, and unknown school values", () => {
    expect(
      buildSchoolAttendanceRows(
        schools,
        [attendee("1", "UNKNOWN"), attendee("2", ["AAA1001"])],
        "sekolah",
      ).map((school) => school.attendeeCount),
    ).toEqual([0, 0]);
  });
});

describe("pkgGroupLabel", () => {
  it("prefixes a zone name as PKG with title case", () => {
    expect(pkgGroupLabel("SITIAWAN")).toBe("PKG Sitiawan");
    expect(pkgGroupLabel("AYER TAWAR")).toBe("PKG Ayer Tawar");
    expect(pkgGroupLabel("PKG BERUAS")).toBe("PKG Beruas");
    expect(pkgGroupLabel("")).toBe("PKG lain");
  });
});

describe("groupSchoolAttendanceByPkg", () => {
  it("groups schools by PKG, sorted by label, keeping school order within a group", () => {
    const rows = [
      { code: "AHA1002", name: "KOLEJ VOKASIONAL SERI MANJUNG", zone: "SITIAWAN", attendeeCount: 1 },
      { code: "ABA1001", name: "SK DENDANG", zone: "BERUAS", attendeeCount: 0 },
      { code: "ABC1061", name: "SJKC AYER TAWAR", zone: "beruas", attendeeCount: 2 },
      { code: "ABC2001", name: "SMK SERI MANJUNG", zone: "PKG SITIAWAN", attendeeCount: 0 },
      { code: "AAA0001", name: "SK TANPA ZON", zone: "  ", attendeeCount: 0 },
    ];

    expect(groupSchoolAttendanceByPkg(rows).map((group) => ({
      label: group.label,
      codes: group.rows.map((row) => row.code),
    }))).toEqual([
      { label: "PKG Beruas", codes: ["ABA1001", "ABC1061"] },
      { label: "PKG Sitiawan", codes: ["AHA1002", "ABC2001"] },
      { label: "PKG lain", codes: ["AAA0001"] },
    ]);
  });
});

describe("formatPkgAttendanceCopy", () => {
  it("formats a WhatsApp-ready list with a PKG heading then its schools", () => {
    expect(
      formatPkgAttendanceCopy([
        {
          zone: "BERUAS",
          label: "PKG Beruas",
          rows: [
            { code: "ABA1001", name: "SK DENDANG", zone: "BERUAS", attendeeCount: 0 },
            { code: "ABC1061", name: "SJKC AYER TAWAR", zone: "BERUAS", attendeeCount: 0 },
          ],
        },
        {
          zone: "SITIAWAN",
          label: "PKG Sitiawan",
          rows: [
            { code: "AHA1002", name: "KOLEJ VOKASIONAL SERI MANJUNG", zone: "SITIAWAN", attendeeCount: 0 },
          ],
        },
      ]),
    ).toBe(
      [
        "PKG Beruas",
        "ABA1001 — SK DENDANG",
        "ABC1061 — SJKC AYER TAWAR",
        "",
        "PKG Sitiawan",
        "AHA1002 — KOLEJ VOKASIONAL SERI MANJUNG",
      ].join("\n"),
    );
  });
});
