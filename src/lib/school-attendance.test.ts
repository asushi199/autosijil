import { describe, expect, it } from "vitest";
import { buildSchoolAttendanceRows } from "./school-attendance";
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
