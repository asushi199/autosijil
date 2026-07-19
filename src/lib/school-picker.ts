import type { SchoolDirectoryEntry } from "./school-directory";

export function filterSchools(schools: SchoolDirectoryEntry[], query: string) {
  const normalized = query.trim().toLocaleLowerCase();
  return schools
    .filter((school) => {
      if (!normalized) return true;
      return school.code.toLocaleLowerCase().includes(normalized)
        || school.name.toLocaleLowerCase().includes(normalized);
    })
    .sort((left, right) => left.code.localeCompare(right.code));
}
