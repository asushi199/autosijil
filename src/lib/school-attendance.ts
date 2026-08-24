import type { SchoolDirectoryEntry } from "./school-directory";
import type { Attendee } from "./types";

export interface SchoolAttendanceRow extends SchoolDirectoryEntry {
  attendeeCount: number;
}

export function buildSchoolAttendanceRows(
  schools: SchoolDirectoryEntry[],
  attendees: Attendee[],
  schoolFieldKey: string,
): SchoolAttendanceRow[] {
  const attendeeCountByCode = new Map<string, number>();

  for (const attendee of attendees) {
    const code = attendee.data?.[schoolFieldKey];
    if (typeof code !== "string") continue;
    attendeeCountByCode.set(code, (attendeeCountByCode.get(code) ?? 0) + 1);
  }

  return schools.map((school) => ({
    ...school,
    attendeeCount: attendeeCountByCode.get(school.code) ?? 0,
  }));
}
