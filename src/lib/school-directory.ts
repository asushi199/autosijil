import type { FormField, FormValue } from "./types";

export interface SchoolDirectoryEntry {
  code: string;
  name: string;
  zone: string;
}

export function schoolOptionLabel(school: SchoolDirectoryEntry) {
  return `${school.code} — ${school.name}`;
}

export function schoolLabelForCode(code: string, schools: SchoolDirectoryEntry[]) {
  const school = schools.find((item) => item.code === code);
  return school ? schoolOptionLabel(school) : code;
}

export function formatFieldValue(
  field: FormField,
  value: FormValue | undefined,
  schools: SchoolDirectoryEntry[],
) {
  if (field.type === "school" && typeof value === "string") {
    return schoolLabelForCode(value, schools);
  }
  return Array.isArray(value) ? value.join(", ") : value ?? "";
}
