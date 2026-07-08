import "server-only";
import { adminClient } from "./supabase/admin";
import { formatTarikh, type SijilValues } from "./pdf";
import type { Attendee, EventRow, FormField, Template } from "./types";

/** Muat majlis + templat + imej latar untuk penjanaan sijil. */
export async function loadSijilContext(event: EventRow) {
  const db = adminClient();
  if (!event.template_id) return { error: "Majlis ini belum mempunyai templat sijil." };
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
  return { template, bgBytes };
}

export function attendeeValues(event: EventRow, attendee: Attendee): SijilValues {
  return {
    name: attendee.name_value,
    ic: attendee.ic_value ?? undefined,
    eventName: event.title,
    eventDate: formatTarikh(event.event_date),
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

/** Nama fail selamat daripada nama peserta. */
export function safeFilename(s: string): string {
  return s.replace(/[^\p{L}\p{N} _.-]/gu, "").trim().replace(/\s+/g, "_") || "sijil";
}
