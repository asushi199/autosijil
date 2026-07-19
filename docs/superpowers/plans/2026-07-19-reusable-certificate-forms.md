# Borang Fleksibel dan Templat Sijil Boleh Guna Semula Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membolehkan borang Program menggunakan jenis soalan lengkap, menyokong Program tanpa sijil, dan memetakan slot sijil templat kepada medan Program secara manual.

**Architecture:** Definisi soalan dan jawapan kekal dalam JSONB pada `events.form_fields` dan `attendees.data`. Templat menyimpan slot peserta generik; `events.certificate_field_mappings` menyimpan padanan slot kepada kunci medan untuk Program tertentu. Fungsi tulen baharu mengesahkan jawapan dan pemetaan supaya route, server action, CSV, dan PDF menggunakan peraturan yang sama.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, Supabase Postgres/Storage, pdf-lib, Vitest.

## Global Constraints

- UI awam dan admin menggunakan Bahasa Melayu.
- Akses Supabase hanya melalui `adminClient()` di kod pelayan; service-role key tidak sampai ke klien.
- Semua perubahan skema mesti idempotent dalam `supabase/migration.sql`.
- PDF kekal dijana on-demand melalui `src/lib/pdf.ts`; jangan simpan PDF.
- Kedudukan templat kekal pecahan 0–1 daripada halaman A4.
- Templat lama, Program lama, dan jawapan lama mesti terus berfungsi.
- No. Kad Pengenalan peserta mesti tepat 12 digit dan tanpa sengkang pada penyerahan baharu.

---

## Struktur fail

| Fail | Tanggungjawab |
| --- | --- |
| `supabase/migration.sql` | Tambah mod sijil dan pemetaan yang disimpan pada Program. |
| `src/lib/types.ts` | Jenis soalan, nilai jawapan, slot templat dan bentuk Event yang diperluas. |
| `src/lib/form-submission.ts` | Normalisasi dan pengesahan tulen untuk semua jawapan borang. |
| `src/lib/certificate-mapping.ts` | Cari slot templat, sahkan pemetaan dan bina nilai cetakan slot. |
| `src/lib/form-submission.test.ts` | Ujian semua jenis soalan dan No. Kad Pengenalan. |
| `src/lib/certificate-mapping.test.ts` | Ujian pemetaan lengkap, tidak lengkap dan nilai cetakan. |
| `src/app/e/[slug]/AttendanceForm.tsx` | Render semua jenis soalan dan hantar nilai tunggal atau berbilang. |
| `src/app/api/e/[slug]/hadir/route.ts` | Gunakan pengesahan pelayan yang sama sebelum menyimpan jawapan. |
| `src/app/admin/events/[id]/edit/EventEditor.tsx` | Konfigurasi soalan, mod sijil dan simpan pemetaan. |
| `src/app/admin/events/[id]/edit/CertificateMappingPanel.tsx` | UI khusus untuk pemetaan slot kepada medan Program. |
| `src/app/admin/templates/[id]/TemplateEditor.tsx` | Tambah sumber Tempat Program dan slot peserta generik. |
| `src/lib/sijil-data.ts`, `src/lib/pdf.ts` | Bekalkan serta cetak tempat tetap dan nilai slot yang dipetakan. |
| `src/app/admin/actions.ts` | Simpan mod/mapping, sahkan pembukaan sijil, dan import data yang serasi. |
| `src/app/admin/events/[id]/StatusControls.tsx` | Sembunyikan tindakan sijil untuk Program tanpa sijil. |
| `src/app/admin/events/[id]/page.tsx`, `AttendeeTable.tsx` | Sembunyikan semua tindakan PDF/sijil bila tidak diperlukan. |
| `src/app/e/[slug]/page.tsx` | Papar Borang Pendaftaran untuk Program tanpa sijil. |
| `src/app/api/admin/events/[id]/csv/route.ts` | Eksport nilai pilihan berbilang sebagai teks. |
| `src/app/admin/page.tsx`, `EventList.tsx`, `events/new/page.tsx` | Papar/pilih mod Program dengan jelas. |

### Task 1: Asas data, jenis dan ujian domain

**Files:**
- Modify: `package.json`
- Modify: `supabase/migration.sql`
- Modify: `src/lib/types.ts`
- Create: `src/lib/form-submission.ts`
- Create: `src/lib/certificate-mapping.ts`
- Create: `src/lib/form-submission.test.ts`
- Create: `src/lib/certificate-mapping.test.ts`

**Interfaces:**
- Produces `FormValue = string | string[]`, `AttendeeData = Record<string, FormValue>`, and expanded `FormField` / `EventRow` types.
- Produces `validateSubmission(fields, raw): { data: AttendeeData; name: string; ic: string | null } | { error: string }`.
- Produces `getTemplateSlots(template)`, `getIncompleteSlotLabels(template, fields, mappings)`, and `slotValues(event, attendee)`.

- [ ] **Step 1: Add a Vitest command and write failing domain tests**

  Update `package.json` scripts and dev dependencies with:

  ```json
  {
    "scripts": { "test": "vitest run" },
    "devDependencies": { "vitest": "^4.0.0" }
  }
  ```

  Create `src/lib/form-submission.test.ts` with the behaviours below:

  ```ts
  import { describe, expect, it } from "vitest";
  import { validateSubmission } from "./form-submission";
  import type { FormField } from "./types";

  const fields: FormField[] = [
    { key: "nama", label: "Nama", type: "text", required: true, role: "name" as const },
    { key: "ic", label: "No. Kad Pengenalan", type: "ic" as const, required: true, role: "ic" as const },
    { key: "jawatan", label: "Jawatan", type: "select" as const, required: true, options: ["Guru", "Pentadbir"] },
    { key: "kursus", label: "Kursus", type: "checkboxes" as const, required: false, options: ["AI", "Canva"] },
  ];

  describe("validateSubmission", () => {
    it("accepts exact options, arrays, and a 12 digit IC", () => {
      expect(validateSubmission(fields, { nama: " Ali ", ic: "900101081234", jawatan: "Guru", kursus: ["AI"] }))
        .toEqual({ data: { nama: "Ali", ic: "900101081234", jawatan: "Guru", kursus: ["AI"] }, name: "Ali", ic: "900101081234" });
    });
    it("rejects an IC with a hyphen or a non-12-digit value", () => {
      expect(validateSubmission(fields, { nama: "Ali", ic: "900101-08-1234", jawatan: "Guru" }))
        .toEqual({ error: "No. Kad Pengenalan mesti mengandungi tepat 12 digit tanpa sengkang." });
    });
    it("rejects values outside configured options", () => {
      expect(validateSubmission(fields, { nama: "Ali", ic: "900101081234", jawatan: "Lain" }))
        .toEqual({ error: "Pilihan bagi medan \"Jawatan\" tidak sah." });
    });
  });
  ```

  Create `src/lib/certificate-mapping.test.ts` with a `participant_slot` template element, a mapped `jawatan` field, and tests that an unmapped slot returns `["Jawatan"]` while a mapped slot resolves its attendee value.

- [ ] **Step 2: Run the tests to verify failure**

  Run: `npm install` then `npm run test`

  Expected: Vitest reports missing `form-submission` and `certificate-mapping` modules or missing exports.

- [ ] **Step 3: Add schema and exact TypeScript interfaces**

  Append the following idempotent database changes to `supabase/migration.sql`:

  ```sql
  alter table public.events
    add column if not exists requires_certificate boolean not null default true,
    add column if not exists certificate_field_mappings jsonb not null default '{}'::jsonb;
  ```

  In `src/lib/types.ts`, retain old type values for compatibility and add:

  ```ts
  export type FieldType = "text" | "textarea" | "select" | "radio" | "checkbox" | "checkboxes" | "date" | "ic";
  export type FormValue = string | string[];
  export type AttendeeData = Record<string, FormValue>;

  export interface FormField {
    key: string;
    label: string;
    type: FieldType;
    required: boolean;
    options?: string[];
    certificateEligible?: boolean;
    role?: "name" | "ic" | "school";
  }

  export type ElementSource = "name" | "ic" | "school" | "event_name" | "event_date" | "event_location" | "participant_slot" | "static";
  export interface TemplateElement { slotId?: string; slotLabel?: string; /* retain all existing properties */ }
  export interface EventRow { requires_certificate: boolean; certificate_field_mappings: Record<string, string>; /* retain all existing properties */ }
  export interface Attendee { data: AttendeeData; /* retain all existing properties */ }
  ```

- [ ] **Step 4: Implement pure normalization and mapping helpers**

  Implement `validateSubmission` so that it trims strings, preserves only configured field keys, validates options exactly, accepts arrays only for `checkboxes`, rejects arrays for all other fields, enforces required fields, limits `text` / `select` / `radio` / `ic` values to 300 characters and `textarea` values to 2,000 characters, and applies this IC check:

  ```ts
  if (field.type === "ic" && !/^\d{12}$/.test(value)) {
    return { error: "No. Kad Pengenalan mesti mengandungi tepat 12 digit tanpa sengkang." };
  }
  ```

  In `certificate-mapping.ts`, use the following signatures:

  ```ts
  export function getTemplateSlots(template: Template): TemplateElement[];
  export function getIncompleteSlotLabels(
    template: Template,
    fields: FormField[],
    mappings: Record<string, string>,
  ): string[];
  export function mappedSlotValues(
    template: Template,
    mappings: Record<string, string>,
    data: AttendeeData,
  ): Record<string, string>;
  ```

  `getIncompleteSlotLabels` must reject missing mappings, mappings to absent fields, and mappings to `checkboxes` or to fields without `certificateEligible`. `mappedSlotValues` must return `""` for an absent answer and never stringify a string array.

- [ ] **Step 5: Run unit, lint, and type/build checks**

  Run: `npm run test`, `npm run lint`, `npm run build`

  Expected: all tests pass; lint and Next build complete without TypeScript errors.

- [ ] **Step 6: Commit the isolated foundation**

  ```bash
  git add package.json package-lock.json supabase/migration.sql src/lib/types.ts src/lib/form-submission.ts src/lib/certificate-mapping.ts src/lib/form-submission.test.ts src/lib/certificate-mapping.test.ts
  git commit -m "feat: add flexible form and mapping domain model"
  ```

### Task 2: Render and validate flexible public forms

**Files:**
- Modify: `src/app/e/[slug]/AttendanceForm.tsx`
- Modify: `src/app/api/e/[slug]/hadir/route.ts`
- Modify: `src/app/admin/events/[id]/edit/EventEditor.tsx`
- Modify: `src/app/admin/actions.ts`
- Modify: `src/app/admin/events/[id]/ImportPanel.tsx`
- Modify: `src/app/admin/events/[id]/AttendeeTable.tsx`
- Modify: `src/app/api/admin/events/[id]/csv/route.ts`

**Interfaces:**
- Consumes `AttendeeData` and `validateSubmission` from Task 1.
- Produces only validated `AttendeeData` rows, including `string[]` for `checkboxes`.

- [ ] **Step 1: Extend the failing tests for date, paragraph and multiselect cases**

  Add these assertions to `src/lib/form-submission.test.ts`:

  ```ts
  it("requires at least one choice for a required multiselect", () => {
    const result = validateSubmission(
      [{ key: "kumpulan", label: "Kumpulan", type: "checkboxes", required: true, options: ["A", "B"] }],
      { kumpulan: [] },
    );
    expect(result).toEqual({ error: "Medan \"Kumpulan\" wajib diisi." });
  });

  it("accepts an ISO date and rejects malformed dates", () => {
    const field = [{ key: "tarikh", label: "Tarikh Lahir", type: "date", required: true }];
    expect(validateSubmission(field, { tarikh: "2026-07-19" })).not.toHaveProperty("error");
    expect(validateSubmission(field, { tarikh: "19/07/2026" })).toEqual({ error: "Tarikh bagi medan \"Tarikh Lahir\" tidak sah." });
  });
  ```

- [ ] **Step 2: Run the focused test to verify failure**

  Run: `npm run test -- src/lib/form-submission.test.ts`

  Expected: the new date and multiselect assertions fail until their validation branches exist.

- [ ] **Step 3: Update the form builder and public renderer**

  Add Malay labels for `textarea`, `checkboxes`, `date`, and `ic` in `EventEditor.tsx`. Show the comma-separated options editor for `select`, `radio`, and `checkboxes`; show an explicit checkbox labelled `Boleh dicetak pada sijil` for non-`checkboxes` non-name fields; when type is `ic`, set its unique `role` to `ic` and remove that role from all other fields.

  In `AttendanceForm.tsx`, change state to `useState<AttendeeData>({})` and render:

  ```tsx
  {f.type === "textarea" && <textarea className="input" rows={4} required={f.required} value={(values[f.key] as string) ?? ""} onChange={(e) => setValue(f.key, e.target.value)} />}
  {f.type === "date" && <input type="date" className="input" required={f.required} value={(values[f.key] as string) ?? ""} onChange={(e) => setValue(f.key, e.target.value)} />}
  {f.type === "ic" && <input inputMode="numeric" pattern="[0-9]{12}" maxLength={12} className="input" required={f.required} value={(values[f.key] as string) ?? ""} onChange={(e) => setValue(f.key, e.target.value.replace(/\D/g, ""))} />}
  ```

  For `checkboxes`, toggle a value in a `string[]`, submit the whole array, and show each configured option as a checkbox with its own visible label.

- [ ] **Step 4: Replace route-local parsing and update all consumers of attendee data**

  Replace the manual loop in `api/e/[slug]/hadir/route.ts` with:

  ```ts
  const result = validateSubmission(event.form_fields ?? [], body.data ?? {});
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  const { error } = await db.from("attendees").insert({
    event_id: event.id,
    data: result.data,
    name_value: result.name,
    ic_value: result.ic,
  });
  ```

  In `importAttendees`, skip `checkboxes` during tabular import and run imported IC values through a helper that removes legacy hyphens before checking exactly 12 digits. In `AttendeeTable.tsx`, use `Array.isArray(value) ? value.join(", ") : value ?? ""` for search and cells. Use the identical conversion in CSV before `csvCell`.

- [ ] **Step 5: Run targeted and full verification**

  Run: `npm run test -- src/lib/form-submission.test.ts`, `npm run lint`, `npm run build`

  Expected: validation tests pass; all existing routes compile with `AttendeeData` values.

- [ ] **Step 6: Commit flexible form delivery**

  ```bash
  git add src/app/e/[slug]/AttendanceForm.tsx src/app/api/e/[slug]/hadir/route.ts src/app/admin/events/[id]/edit/EventEditor.tsx src/app/admin/actions.ts src/app/admin/events/[id]/ImportPanel.tsx src/app/admin/events/[id]/AttendeeTable.tsx src/app/api/admin/events/[id]/csv/route.ts src/lib/form-submission.test.ts
  git commit -m "feat: support flexible program form questions"
  ```

### Task 3: Add reusable template slots and manual Program mapping

**Files:**
- Modify: `src/app/admin/templates/[id]/TemplateEditor.tsx`
- Modify: `src/app/admin/events/[id]/edit/page.tsx`
- Modify: `src/app/admin/events/[id]/edit/EventEditor.tsx`
- Create: `src/app/admin/events/[id]/edit/CertificateMappingPanel.tsx`
- Modify: `src/app/admin/actions.ts`
- Modify: `src/lib/sijil-data.ts`
- Modify: `src/lib/pdf.ts`
- Modify: `src/app/api/e/[slug]/sijil/route.ts`
- Modify: `src/app/api/admin/events/[id]/sijil/route.ts`
- Modify: `src/app/api/admin/events/[id]/pdf/route.ts`
- Modify: `src/app/api/admin/events/[id]/zip/route.ts`
- Modify: `src/app/api/admin/events/[id]/sample/route.ts`
- Modify: `src/app/api/admin/templates/[id]/preview/route.ts`
- Modify: `src/app/admin/events/[id]/StatusControls.tsx`

**Interfaces:**
- Consumes `getTemplateSlots`, `getIncompleteSlotLabels`, and `mappedSlotValues` from Task 1.
- Produces `certificate_field_mappings` keyed by `TemplateElement.slotId` on an Event.

- [ ] **Step 1: Extend mapping tests before UI or PDF work**

  Add tests proving all three cases:

  ```ts
  expect(getIncompleteSlotLabels(template, fields, { unit_slot: "unit" })).toEqual([]);
  expect(getIncompleteSlotLabels(template, fields, {})).toEqual(["Jabatan / Sekolah"]);
  expect(getIncompleteSlotLabels(template, fields, { unit_slot: "multi" })).toEqual(["Jabatan / Sekolah"]);
  ```

  The `multi` field in the final assertion must be `type: "checkboxes"` so mapping a multiselect is explicitly refused.

- [ ] **Step 2: Run mapping tests to verify failure**

  Run: `npm run test -- src/lib/certificate-mapping.test.ts`

  Expected: any not-yet-implemented mapping rule fails.

- [ ] **Step 3: Add slot creation and fixed-place rendering in the template editor**

  Extend `SOURCE_LABEL` and `SAMPLE` in `TemplateEditor.tsx` with `event_location: "Tempat Program"`. Add one separate button labelled `+ Slot Maklumat Peserta`; it creates:

  ```ts
  {
    id: newId(),
    source: "participant_slot",
    slotId: `slot_${Date.now().toString(36)}`,
    slotLabel: "Maklumat peserta",
    x: 0.5, y: 0.5, size: 16, font: "poppins", color: "#1a1a1a",
    align: "center", boxWidth: 0.8, fit: "wrap", lineHeight: 1.15,
  }
  ```

  When a `participant_slot` is selected, render a required `Label slot` input that updates `slotLabel`; use that label in the editor preview. Keep the legacy `school` source unchanged.

- [ ] **Step 4: Add the program-specific mapping panel and save path**

  Change `edit/page.tsx` to fetch `id, name, orientation, elements` for templates. Create `CertificateMappingPanel.tsx` that accepts `template`, `fields`, `mappings`, and `onChange`. It must list only `certificateEligible` fields whose type is not `checkboxes`, show `Pilih medan` for each slot, and show a Malay warning for mappings that no longer point to a valid eligible field.

  Extend `UpdateEventPayload` with:

  ```ts
  requires_certificate: boolean;
  certificate_field_mappings: Record<string, string>;
  ```

  Store both values in `updateEvent`. Do not auto-match labels. Changing templates leaves mappings for other slot IDs stored but the panel and release validator only consider slots in the selected template.

- [ ] **Step 5: Resolve slots for PDF and block incomplete certificate release**

  Extend `SijilValues` with:

  ```ts
  eventLocation: string;
  slots: Record<string, string>;
  ```

  Change the data helper signature to `attendeeValues(event: EventRow, attendee: Attendee, template: Template): SijilValues`. It calls `mappedSlotValues(template, event.certificate_field_mappings, attendee.data)`, sets `eventLocation: event.location ?? ""`, and preserves legacy school resolution. In `resolveText`, return `v.eventLocation` for `event_location` and `v.slots[el.slotId ?? ""] ?? ""` for `participant_slot`.

  Update all four attendee-driven certificate routes (`/api/e/[slug]/sijil`, admin single sijil, admin PDF, and admin ZIP) to pass their loaded template as the third `attendeeValues` argument. Update sample and template-preview routes to provide `eventLocation` and a `slots` object made from `getTemplateSlots(template)` where every value is `"Contoh maklumat peserta"`; this ensures a new slot is visible in every preview rather than blank.

  Before `updateEventStatus` permits `released`, load the Event and its selected Template. Return an error if `requires_certificate` is false, no template exists, or `getIncompleteSlotLabels` returns labels. Pass `requiresCertificate` and `incompleteSlots` to `StatusControls`; disable release and display `Lengkapkan pemetaan: <labels>.` when needed.

- [ ] **Step 6: Run mapping/PDF verification and commit**

  Run: `npm run test -- src/lib/certificate-mapping.test.ts`, `npm run lint`, `npm run build`

  Expected: slot values print from the Program mapping and release cannot be opened with a missing/invalid mapping.

  ```bash
  git add src/app/admin/templates/[id]/TemplateEditor.tsx src/app/admin/events/[id]/edit/page.tsx src/app/admin/events/[id]/edit/EventEditor.tsx src/app/admin/events/[id]/edit/CertificateMappingPanel.tsx src/app/admin/actions.ts src/lib/sijil-data.ts src/lib/pdf.ts src/app/api/e/[slug]/sijil/route.ts src/app/api/admin/events/[id]/sijil/route.ts src/app/api/admin/events/[id]/pdf/route.ts src/app/api/admin/events/[id]/zip/route.ts src/app/api/admin/events/[id]/sample/route.ts src/app/api/admin/templates/[id]/preview/route.ts src/app/admin/events/[id]/StatusControls.tsx src/lib/certificate-mapping.test.ts
  git commit -m "feat: map reusable certificate template slots"
  ```

### Task 4: Deliver the no-certificate registration mode

**Files:**
- Modify: `src/app/admin/events/new/page.tsx`
- Modify: `src/app/admin/actions.ts`
- Modify: `src/app/admin/events/[id]/edit/EventEditor.tsx`
- Modify: `src/app/admin/events/[id]/page.tsx`
- Modify: `src/app/admin/events/[id]/AttendeeTable.tsx`
- Modify: `src/app/admin/events/[id]/StatusControls.tsx`
- Modify: `src/app/e/[slug]/page.tsx`
- Modify: `src/app/e/[slug]/AttendanceForm.tsx`
- Modify: `src/app/admin/page.tsx`
- Modify: `src/app/admin/EventList.tsx`

**Interfaces:**
- Consumes `EventRow.requires_certificate` from Task 1.
- Produces a Program with all attendance/CSV/archive functions but no certificate UI or release path when `requires_certificate` is false.

- [ ] **Step 1: Add the failing mode-level tests**

  Add a pure test in `certificate-mapping.test.ts` that asserts a no-certificate event is rejected by the certificate release guard. Extract the guard as:

  ```ts
  export function certificateReleaseError(
    event: Pick<EventRow, "requires_certificate" | "form_fields" | "certificate_field_mappings">,
    template: Template | null,
  ): string | null;
  ```

  Assert `certificateReleaseError({ requires_certificate: false, ... }, template)` equals `"Program ini tidak memerlukan sijil."`.

- [ ] **Step 2: Run the focused test to verify failure**

  Run: `npm run test -- src/lib/certificate-mapping.test.ts`

  Expected: the mode guard export is absent or its assertion fails.

- [ ] **Step 3: Implement creation/editing and public labels**

  Add a checked-by-default checkbox `name="requires_certificate"` labelled `Perlu sijil untuk peserta` to `events/new/page.tsx`. In `createEvent`, set `requires_certificate: formData.get("requires_certificate") === "on"`.

  In `EventEditor.tsx`, add controlled `requiresCertificate` state. When false, hide the template selector and `CertificateMappingPanel`; preserve existing template/mapping data in storage so changing back does not delete configuration.

  Pass `isRegistration={!event.requires_certificate}` into `AttendanceForm`. Use the following dynamic Malay copy:

  ```tsx
  const noun = isRegistration ? "Pendaftaran" : "Kehadiran";
  <p className="font-medium">Terima kasih! {noun} anda telah direkodkan.</p>
  ```

  In the public page, render `Borang Pendaftaran` above the form for no-certificate events. When status is `closed`, omit the certificate-availability paragraph for no-certificate events. A no-certificate event must never reach the `released` branch because the server guard prevents it.

- [ ] **Step 4: Remove certificate-only controls while keeping archive tools**

  Pass `requiresCertificate` to `StatusControls` and omit the `released` step for false. In the event detail, keep QR, `ImportPanel`, `AttendeeTable`, and CSV for both modes; condition every preview, one-PDF, ZIP, and per-attendee sijil link on `event.requires_certificate && event.template_id`.

  Add `requires_certificate` to the dashboard select, `EventRowLite`, and cards/list rows. Render `Dengan Sijil` or `Tanpa Sijil` as a compact secondary badge next to the status.

- [ ] **Step 5: Verify the complete no-certificate flow and commit**

  Run: `npm run test`, `npm run lint`, `npm run build`

  Then, with valid Supabase test credentials, manually verify: create a Program with `Perlu sijil` unchecked; add a dropdown; open its QR URL; submit; close the form; export CSV; confirm that no template, preview, PDF, ZIP, participant sijil, or release action is available.

  ```bash
  git add src/app/admin/events/new/page.tsx src/app/admin/actions.ts src/app/admin/events/[id]/edit/EventEditor.tsx src/app/admin/events/[id]/page.tsx src/app/admin/events/[id]/AttendeeTable.tsx src/app/admin/events/[id]/StatusControls.tsx src/app/e/[slug]/page.tsx src/app/e/[slug]/AttendanceForm.tsx src/app/admin/page.tsx src/app/admin/EventList.tsx src/lib/certificate-mapping.ts src/lib/certificate-mapping.test.ts
  git commit -m "feat: add no-certificate registration programs"
  ```

### Task 5: Regression review and documentation handoff

**Files:**
- Modify: `README.md`
- Modify: `AI_CONTEXT_LOG.md`

**Interfaces:**
- Consumes the delivered Program modes, question types, mapping UI, and validation from Tasks 1–4.
- Produces current operator guidance and a durable decision record.

- [ ] **Step 1: Add operator documentation before final review**

  Add a README section titled `Borang fleksibel dan templat boleh guna semula` describing this exact sequence: create Program; select `Perlu sijil` or disable it; configure fields; mark single-value fields printable; choose a reusable template; map every slot manually; only then open certificate download. Add a short note that a no-certificate Program remains exportable through CSV.

  Add an AI context log entry that records: manual mapping is deliberately required; `checkboxes` values are archived/exported but cannot print on a certificate; IC inputs require exactly 12 digits; no-certificate Programs keep QR and CSV but cannot release certificates.

- [ ] **Step 2: Run all automated checks**

  Run: `npm run test`, `npm run lint`, `npm run build`, `git diff --check`

  Expected: every command succeeds with no whitespace errors.

- [ ] **Step 3: Inspect the changed surface and commit documentation**

  Run: `git status --short` and inspect only files listed by this plan. Confirm no environment file, credential, generated PDF, or unrelated user change is staged.

  ```bash
  git add README.md AI_CONTEXT_LOG.md
  git commit -m "docs: explain flexible program and certificate mapping"
  ```

## Plan self-review

- **Spec coverage:** Task 1 covers idempotent storage and core validation; Task 2 covers all requested question types, submission, tables, import and CSV; Task 3 covers reusable templates, manual mapping, fixed place, PDF values and release protection; Task 4 covers the archived no-certificate registration flow; Task 5 records operator guidance and final verification.
- **No-placeholder scan:** Every task identifies concrete paths, exported interfaces, test cases, commands, acceptance outcomes, and commit commands. No deferred work item is used as a substitute for an implementation decision.
- **Type consistency:** `AttendeeData`, `FormValue`, `certificate_field_mappings`, `participant_slot`, `event_location`, `requires_certificate`, and the helper function names are defined in Task 1 before Tasks 2–4 consume them.
