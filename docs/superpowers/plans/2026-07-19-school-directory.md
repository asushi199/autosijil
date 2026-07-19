# Reusable School Directory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a reusable Manjung school directory field that stores a school code and displays `KOD — NAMA` in all participant-facing outputs.

**Architecture:** A RLS-protected `school_directory` table is the source of truth. The new `school` form type stores its code in `attendees.data`; server-side routes load directory data to validate it and shared helpers resolve labels.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest, Supabase Postgres.

## Global Constraints

- UI copy remains Bahasa Melayu.
- Database access stays server-only through `adminClient()`.
- `supabase/migration.sql` is idempotent and enables RLS for the new table.
- A school stores `ABA1001`; human-facing output shows `ABA1001 — SK DENDANG`.
- Unit / Bahagian remains a separate text or ordinary choice field.

### Task 1: Shared types and label helpers

**Files:** Create `src/lib/school-directory.ts`, `src/lib/school-directory.test.ts`; modify `src/lib/types.ts`.

**Interfaces:** Add `school` to `FieldType`; expose `SchoolDirectoryEntry`, `schoolOptionLabel`, `schoolLabelForCode`, and `formatFieldValue`.

- [ ] Write a failing Vitest test that expects `schoolOptionLabel({ code: "ABA1001", name: "SK DENDANG", zone: "BERUAS" })` and `schoolLabelForCode("ABA1001", schools)` to both equal `ABA1001 — SK DENDANG`, and an unknown code to stay unchanged.
- [ ] Run `npm.cmd run test -- src/lib/school-directory.test.ts`; it must fail before the helper exists.
- [ ] Implement the helpers; only values belonging to a `school` form field are converted from code to label.
- [ ] Re-run the focused test until it passes, then commit with `feat: add reusable school directory helpers`.

### Task 2: Schema and 102-school CSV import

**Files:** Modify `supabase/migration.sql`; create `src/lib/school-directory-import.ts`, `src/lib/school-directory-import.test.ts`, and `scripts/import-school-directory.mjs`.

**Interfaces:** `parseSchoolDirectoryCsv(csv)` returns rows shaped as `{ code, name, zone, source_updated_at }`; the script accepts a CSV path and upserts by `code`.

- [ ] Write a failing parser test using the actual `kod_sekolah,nama_sekolah,zon,kemaskini_terakhir,peranan_diisi` header and an `ABA1001` row.
- [ ] Run `npm.cmd run test -- src/lib/school-directory-import.test.ts`; it must fail before the parser exists.
- [ ] Add the table `school_directory(code text primary key, name text not null, zone text not null, source_updated_at timestamptz, created_at timestamptz default now(), updated_at timestamptz default now())` and enable RLS.
- [ ] Implement a CSV parser that rejects a missing code or name. The import script reads `process.argv[2]`, calls Supabase `upsert(rows, { onConflict: "code" })`, and prints only the imported row count.
- [ ] Run the added SQL in Supabase SQL Editor, then run `node --env-file=.env.local scripts/import-school-directory.mjs "C:\Users\asush\Downloads\direktori-schools-2026-07-19.csv"`. Verify the count is 102 with a server-side query. Commit with `feat: add Manjung school directory import`.

### Task 3: Program editor and public selector

**Files:** Modify `src/app/admin/events/[id]/edit/EventEditor.tsx`, `src/app/e/[slug]/page.tsx`, and `src/app/e/[slug]/AttendanceForm.tsx`.

**Interfaces:** `AttendanceForm` receives `schools: SchoolDirectoryEntry[]`; a `school` field renders a select where option value is the code and visible text is `schoolOptionLabel(school)`.

- [ ] Add `Direktori Sekolah` to the field-type menu. Do not show comma-separated manual options for this type; retain the existing School / Unit certificate role.
- [ ] On the public event page, fetch `code, name, zone` ordered by name only when a Program uses `type === "school"` and pass the data to `AttendanceForm`.
- [ ] Render a required-capable selector with a `— Pilih sekolah —` placeholder and `ABA1001 — SK DENDANG` options.
- [ ] Locally confirm a separate `Unit / Bahagian` text field can still be added alongside it. Commit with `feat: add school directory form field`.

### Task 4: Validation and consistent output labels

**Files:** Modify `src/lib/form-submission.ts`, `src/lib/form-submission.test.ts`, the attendance POST route, `AttendeeTable`, event detail page, CSV route, `src/lib/sijil-data.ts`, and all four certificate PDF routes.

**Interfaces:** `validateSubmission(fields, raw, schoolCodes?: ReadonlySet<string>)` rejects unknown school codes. `attendeeValues(event, attendee, template, schools)` resolves codes before filling the school source and participant template slots.

- [ ] Write a failing test proving `ABA1001` is accepted with `new Set(["ABA1001"])` and `SALAH` returns `Pilihan bagi medan "Sekolah" tidak sah.`.
- [ ] Run `npm.cmd run test -- src/lib/form-submission.test.ts`; it must fail because a school code is not yet validated.
- [ ] Load codes in the attendance route only when a school field exists. Use shared label formatting in the admin table and CSV. Load the directory once for every certificate request and resolve both the legacy School / Unit element and manually mapped slots.
- [ ] Verify focused tests pass and the admin table, CSV and sample certificate all show `ABA1001 — SK DENDANG`. Commit with `feat: validate and display school directory values`.

### Task 5: Documentation, verification and push

**Files:** Modify `README.md` and `AI_CONTEXT_LOG.md`.

- [ ] Document the directory field, its `KOD — NAMA` display, separate Unit / Bahagian field, and repeat-import command.
- [ ] Run `npm.cmd run test`, `git diff --check`, `npm.cmd run lint`, and `npm.cmd run build`; each must exit successfully.
- [ ] Commit docs with `docs: explain reusable school directory`, then run `git push origin main`.
