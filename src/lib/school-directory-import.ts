export interface SchoolDirectoryImportRow {
  code: string;
  name: string;
  zone: string;
  source_updated_at: string;
}

function parseCsvRows(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < csv.length; i += 1) {
    const char = csv[i];
    if (quoted) {
      if (char === '"' && csv[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }

  if (quoted) throw new Error("Format CSV tidak sah: tanda petik tidak lengkap.");
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

export function parseSchoolDirectoryCsv(csv: string): SchoolDirectoryImportRow[] {
  const [header, ...rows] = parseCsvRows(csv.replace(/^\uFEFF/, ""));
  const expected = ["kod_sekolah", "nama_sekolah", "zon", "kemaskini_terakhir"];
  if (!header || expected.some((name, index) => header[index] !== name)) {
    throw new Error("Header CSV direktori sekolah tidak sah.");
  }

  return rows
    .filter((row) => row.some((cell) => cell.trim()))
    .map((row, index) => {
      const [codeRaw, nameRaw, zoneRaw, sourceUpdatedRaw] = row;
      const code = codeRaw?.trim();
      const name = nameRaw?.trim();
      const zone = zoneRaw?.trim();
      const source_updated_at = sourceUpdatedRaw?.trim();
      if (!code || !name) throw new Error(`Kod atau nama sekolah tiada pada baris ${index + 2}.`);
      if (!zone || !source_updated_at) throw new Error(`Maklumat zon atau kemas kini tiada pada baris ${index + 2}.`);
      return { code, name, zone, source_updated_at };
    });
}
