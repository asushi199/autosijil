function normalizeSearch(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

export function suggestCertificateNames(names: string[], query: string) {
  const needle = normalizeSearch(query);
  if (needle.length < 3) return [];

  return [...new Set(names)]
    .filter((name) => normalizeSearch(name).includes(needle))
    .sort((left, right) => left.localeCompare(right))
    .slice(0, 8);
}
