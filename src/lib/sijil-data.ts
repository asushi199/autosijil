import "server-only";
import { adminClient } from "./supabase/admin";
import { formatTarikh, type SijilValues } from "./pdf";
import type { Attendee, AttendeeData, EventRow, FormField, Template } from "./types";
import { mappedSlotValues } from "./certificate-mapping";
import { schoolLabelForCode, type SchoolDirectoryEntry } from "./school-directory";

/** Muat program + templat + imej latar untuk penjanaan sijil. */
export async function loadSijilContext(event: EventRow) {
  const db = adminClient();
  if (!event.template_id) return { error: "Program ini belum mempunyai templat sijil." };
  const { data: template } = await db
    .from("templates")
    .select("*")
    .eq("id", event.template_id)
    .single<Template>();
  if (!template) return { error: "Templat sijil tidak ditemui." };

  let bgBytes: Uint8Array | null = null;
  if (template.bg_image_path) {
    const { data: blob, error } = await db.storage
      .from("templates")
      .download(template.bg_image_path);
    if (error || !blob) return { error: "Imej latar templat tidak dapat dimuat." };
    bgBytes = new Uint8Array(await blob.arrayBuffer());
  }
  const schools: SchoolDirectoryEntry[] = (event.form_fields ?? []).some((field) => field.type === "school")
    ? ((await db.from("school_directory").select("code, name, zone").order("code")).data ?? []) as SchoolDirectoryEntry[]
    : [];
  return { template, bgBytes, schools };
}

export function attendeeValues(
  event: EventRow,
  attendee: Attendee,
  template?: Template,
  schools: SchoolDirectoryEntry[] = [],
): SijilValues {
  const displayData: AttendeeData = { ...attendee.data };
  for (const field of event.form_fields ?? []) {
    const value = displayData[field.key];
    if (field.type === "school" && typeof value === "string") {
      displayData[field.key] = schoolLabelForCode(value, schools);
    }
  }
  // Sekolah bukan lajur khas — dibaca daripada jawapan borang mengikut medan role 'school'.
  const schoolField = (event.form_fields ?? []).find((f) => f.role === "school");
  const schoolValue = schoolField ? displayData[schoolField.key] : undefined;
  return {
    name: attendee.name_value,
    ic: attendee.ic_value ?? undefined,
    school: typeof schoolValue === "string" ? schoolValue : undefined,
    eventName: event.title,
    eventDate: formatTarikh(event.event_date),
    eventLocation: event.location ?? "",
    slots: template ? mappedSlotValues(template, event.certificate_field_mappings ?? {}, displayData) : {},
  };
}

/** Ekstrak nilai nama & IC daripada jawapan borang berdasarkan role medan. */
export function extractRoles(fields: FormField[], data: Record<string, string>) {
  const nameField = fields.find((f) => f.role === "name");
  const icField = fields.find((f) => f.role === "ic");
  const name = nameField ? (data[nameField.key] ?? "").trim() : "";
  const icRaw = icField ? (data[icField.key] ?? "").trim() : "";
  return { name, ic: icRaw ? normalizeIc(icRaw) : null };
}

/** Buang sengkang/ruang supaya perbandingan IC konsisten. */
export function normalizeIc(s: string): string {
  return s.replace(/[\s-]/g, "");
}

/**
 * Normalisasi nama untuk padanan semakan sijil: kecutkan ruang berlebihan jadi
 * satu ruang, buang ruang hujung, dan huruf kecil. Supaya "Ali  bin  Abu"
 * (dua ruang) padan dengan "Ali bin Abu".
 */
export function normalizeName(s: string): string {
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Nama fail selamat daripada nama peserta. */
export function safeFilename(s: string): string {
  return s.replace(/[^\p{L}\p{N} _.-]/gu, "").trim().replace(/\s+/g, "_") || "sijil";
}
