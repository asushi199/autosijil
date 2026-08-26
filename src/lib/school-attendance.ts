import type { SchoolDirectoryEntry } from "./school-directory";
import type { Attendee } from "./types";

export interface SchoolAttendanceRow extends SchoolDirectoryEntry {
  attendeeCount: number;
}

export interface SchoolAttendancePkgGroup {
  zone: string;
  label: string;
  rows: SchoolAttendanceRow[];
}

function titleCaseWords(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function pkgGroupKey(zone: string) {
  return zone.trim().replace(/^pkg\s+/i, "").trim().toUpperCase();
}

export function pkgGroupLabel(zone: string) {
  const key = pkgGroupKey(zone);
  if (!key) return "PKG lain";
  return `PKG ${titleCaseWords(key)}`;
}

export function schoolAttendanceLine(row: SchoolAttendanceRow) {
  return `${row.code} — ${row.name}`;
}

export function groupSchoolAttendanceByPkg(rows: SchoolAttendanceRow[]): SchoolAttendancePkgGroup[] {
  const byKey = new Map<string, SchoolAttendanceRow[]>();

  for (const row of rows) {
    const key = pkgGroupKey(row.zone);
    const existing = byKey.get(key);
    if (existing) existing.push(row);
    else byKey.set(key, [row]);
  }

  return [...byKey.entries()]
    .map(([zone, groupRows]) => ({
      zone,
      label: pkgGroupLabel(zone),
      rows: groupRows,
    }))
    .sort((a, b) => {
      if (a.label === "PKG lain") return 1;
      if (b.label === "PKG lain") return -1;
      return a.label.localeCompare(b.label, "ms");
    });
}

export function formatPkgAttendanceCopy(groups: SchoolAttendancePkgGroup[]) {
  return groups
    .filter((group) => group.rows.length > 0)
    .map((group) => [group.label, ...group.rows.map(schoolAttendanceLine)].join("\n"))
    .join("\n\n");
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
