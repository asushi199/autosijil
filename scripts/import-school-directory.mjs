import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

function parseCsvRows(csv) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < csv.length; i += 1) {
    const char = csv[i];
    if (quoted) {
      if (char === '"' && csv[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') quoted = false;
      else cell += char;
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
    } else if (char !== "\r") cell += char;
  }
  if (quoted) throw new Error("Format CSV tidak sah: tanda petik tidak lengkap.");
  if (cell || row.length) rows.push([...row, cell]);
  return rows;
}

function parseSchoolDirectoryCsv(csv) {
  const [header, ...rows] = parseCsvRows(csv.replace(/^\uFEFF/, ""));
  const expected = ["kod_sekolah", "nama_sekolah", "zon", "kemaskini_terakhir"];
  if (!header || expected.some((name, index) => header[index] !== name)) {
    throw new Error("Header CSV direktori sekolah tidak sah.");
  }
  return rows.filter((row) => row.some((cell) => cell.trim())).map((row, index) => {
    const [codeRaw, nameRaw, zoneRaw, sourceUpdatedRaw] = row;
    const code = codeRaw?.trim();
    const name = nameRaw?.trim();
    const zone = zoneRaw?.trim();
    const source_updated_at = sourceUpdatedRaw?.trim();
    if (!code || !name || !zone || !source_updated_at) {
      throw new Error(`Maklumat sekolah tidak lengkap pada baris ${index + 2}.`);
    }
    return { code, name, zone, source_updated_at, updated_at: new Date().toISOString() };
  });
}

const filePath = process.argv[2];
if (!filePath) throw new Error("Sila beri laluan fail CSV direktori sekolah.");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) throw new Error("Pemboleh ubah Supabase tidak lengkap.");

const rows = parseSchoolDirectoryCsv(await readFile(filePath, "utf8"));
const client = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
const { error } = await client.from("school_directory").upsert(rows, { onConflict: "code" });
if (error) throw new Error(error.message);
console.log(`Imported ${rows.length} schools.`);
