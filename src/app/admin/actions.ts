"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { adminClient } from "@/lib/supabase/admin";
import { ADMIN_COOKIE, adminToken, isAuthedCookie, passwordMatches } from "@/lib/admin-auth";
import { normalizeIc } from "@/lib/sijil-data";
import { newSlug } from "@/lib/slug";
import type { EventRow, EventStatus, FormField, Orientation, Template, TemplateElement } from "@/lib/types";
import { getIncompleteSlotLabels } from "@/lib/certificate-mapping";

async function requireUser() {
  const store = await cookies();
  const ok = await isAuthedCookie(store.get(ADMIN_COOKIE)?.value);
  if (!ok) throw new Error("Tidak dibenarkan");
}

// ============ Program ============

const DEFAULT_FIELDS: FormField[] = [
  { key: "nama", label: "Nama Penuh", type: "text", required: true, role: "name" },
  { key: "sekolah", label: "Sekolah / Unit", type: "text", required: true },
];

export async function createEvent(formData: FormData) {
  await requireUser();
  const title = String(formData.get("title") || "").trim();
  if (!title) throw new Error("Nama program diperlukan");
  const db = adminClient();
  const { data, error } = await db
    .from("events")
    .insert({
      slug: newSlug(),
      title,
      event_date: String(formData.get("event_date") || "") || null,
      location: String(formData.get("location") || "").trim() || null,
      requires_certificate: formData.get("requires_certificate") === "on",
      form_fields: DEFAULT_FIELDS,
      created_by: null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  redirect(`/admin/events/${data.id}/edit`);
}

export interface UpdateEventPayload {
  title: string;
  description: string | null;
  event_date: string | null;
  location: string | null;
  form_fields: FormField[];
  template_id: string | null;
  requires_certificate: boolean;
  certificate_field_mappings: Record<string, string>;
}

export async function updateEvent(id: string, payload: UpdateEventPayload) {
  await requireUser();
  if (!payload.title.trim()) return { error: "Nama program diperlukan" };
  const nameFields = payload.form_fields.filter((f) => f.role === "name");
  if (nameFields.length !== 1) {
    return { error: "Tetapkan tepat satu medan sebagai 'Nama (dicetak pada sijil)'." };
  }
  const db = adminClient();
  const { error } = await db.from("events").update(payload).eq("id", id);
  if (error) return { error: error.message };

  // Buang templat khas program yang tidak lagi dipilih (elak orphan).
  const { data: owned } = await db
    .from("templates")
    .select("id, bg_image_path")
    .eq("owner_event_id", id);
  for (const tpl of owned ?? []) {
    if (tpl.id === payload.template_id) continue;
    if (tpl.bg_image_path) {
      await db.storage.from("templates").remove([tpl.bg_image_path]);
    }
    await db.from("templates").delete().eq("id", tpl.id);
  }

  revalidatePath(`/admin/events/${id}`);
  return { ok: true };
}

/**
 * Buka (atau cipta) templat khas untuk program ini.
 * `baseTemplateId` = pilihan semasa dalam dropdown (induk atau salinan sedia ada).
 * Mengembalikan URL editor — klien navigasi (elak redirect dalam try/catch).
 */
export async function customizeEventTemplate(
  eventId: string,
  baseTemplateId: string,
): Promise<{ error: string } | { url: string }> {
  await requireUser();
  const db = adminClient();
  const { data: event } = await db.from("events").select("*").eq("id", eventId).single<EventRow>();
  if (!event) return { error: "Program tidak ditemui" };
  if (!baseTemplateId) return { error: "Pilih templat sijil dahulu." };

  const { data: base, error: baseErr } = await db
    .from("templates")
    .select("*")
    .eq("id", baseTemplateId)
    .single<Template>();
  if (baseErr || !base) return { error: baseErr?.message || "Templat tidak ditemui" };

  if (base.owner_event_id && base.owner_event_id !== eventId) {
    return { error: "Templat ini milik program lain." };
  }

  // Sudah templat khas program ini — terus edit.
  if (base.owner_event_id === eventId) {
    return { url: `/admin/templates/${base.id}?event=${eventId}` };
  }

  // Ada salinan khas sedia ada yang datang dari induk yang sama — guna semula.
  const { data: existingOwned } = await db
    .from("templates")
    .select("*")
    .eq("owner_event_id", eventId)
    .maybeSingle<Template>();
  if (existingOwned && existingOwned.source_template_id === base.id) {
    if (event.template_id !== existingOwned.id) {
      await db.from("events").update({ template_id: existingOwned.id }).eq("id", eventId);
      revalidatePath(`/admin/events/${eventId}`);
    }
    return { url: `/admin/templates/${existingOwned.id}?event=${eventId}` };
  }

  // Buang salinan lama jika wujud (tukar asas induk).
  if (existingOwned) {
    if (existingOwned.bg_image_path) {
      await db.storage.from("templates").remove([existingOwned.bg_image_path]);
    }
    if (event.template_id === existingOwned.id) {
      await db.from("events").update({ template_id: null }).eq("id", eventId);
    }
    await db.from("templates").delete().eq("id", existingOwned.id);
  }

  const shortTitle = event.title.length > 40 ? `${event.title.slice(0, 40)}…` : event.title;
  const { data: created, error } = await db
    .from("templates")
    .insert({
      name: `${base.name} — ${shortTitle}`,
      orientation: base.orientation,
      elements: base.elements,
      bg_image_path: null,
      owner_event_id: eventId,
      source_template_id: base.id,
    })
    .select("id")
    .single();
  if (error || !created) return { error: error?.message || "Gagal mencipta templat khas" };

  if (base.bg_image_path) {
    const newPath = `${created.id}/${Date.now()}.${base.bg_image_path.split(".").pop()}`;
    const { error: cpErr } = await db.storage.from("templates").copy(base.bg_image_path, newPath);
    if (!cpErr) {
      await db.from("templates").update({ bg_image_path: newPath }).eq("id", created.id);
    }
  }

  const { error: linkErr } = await db
    .from("events")
    .update({ template_id: created.id })
    .eq("id", eventId);
  if (linkErr) return { error: linkErr.message };

  revalidatePath(`/admin/events/${eventId}`);
  return { url: `/admin/templates/${created.id}?event=${eventId}` };
}

/** Susunan baris nama program pada sijil (dari editor templat khas). */
export async function updateEventCertificateTitle(
  eventId: string,
  certificateTitle: string,
): Promise<{ error: string } | { ok: true }> {
  await requireUser();
  const db = adminClient();
  const value = certificateTitle.trim() ? certificateTitle : null;
  const { error } = await db
    .from("events")
    .update({ certificate_title: value })
    .eq("id", eventId);
  if (error) return { error: error.message };
  revalidatePath(`/admin/events/${eventId}`);
  return { ok: true };
}

export async function updateEventStatus(id: string, status: EventStatus) {
  await requireUser();
  const db = adminClient();
  if (status === "released") {
    const { data: event } = await db.from("events").select("*").eq("id", id).single<EventRow>();
    if (!event?.requires_certificate) throw new Error("Program ini tidak memerlukan sijil.");
    if (!event.template_id) throw new Error("Pilih templat sijil dahulu.");
    const { data: template } = await db.from("templates").select("*").eq("id", event.template_id).single<Template>();
    if (!template) throw new Error("Templat sijil tidak ditemui.");
    const incomplete = getIncompleteSlotLabels(template, event.form_fields ?? [], event.certificate_field_mappings ?? {});
    if (incomplete.length) throw new Error(`Lengkapkan pemetaan: ${incomplete.join(", ")}.`);
  }
  const { error } = await db.from("events").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/events/${id}`);
  revalidatePath("/admin");
}

export async function deleteEvent(id: string) {
  await requireUser();
  const db = adminClient();
  const { error } = await db.from("events").delete().eq("id", id);
  if (error) throw new Error(error.message);
  redirect("/admin");
}

export async function deleteAttendee(eventId: string, attendeeId: string) {
  await requireUser();
  const db = adminClient();
  const { error } = await db
    .from("attendees")
    .delete()
    .eq("id", attendeeId)
    .eq("event_id", eventId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/events/${eventId}`);
}

/** Kemas kini nama seorang peserta (betulkan salah taip supaya semakan sijil padan). */
export async function updateAttendeeName(eventId: string, attendeeId: string, newName: string) {
  await requireUser();
  const name = newName.trim();
  if (!name) return { error: "Nama tidak boleh kosong." };
  if (name.length > 300) return { error: "Nama terlalu panjang." };

  const db = adminClient();
  const { data: event } = await db
    .from("events")
    .select("form_fields")
    .eq("id", eventId)
    .single<{ form_fields: FormField[] }>();
  const nameKey = (event?.form_fields ?? []).find((f) => f.role === "name")?.key;

  const { data: attendee } = await db
    .from("attendees")
    .select("data")
    .eq("id", attendeeId)
    .eq("event_id", eventId)
    .single<{ data: Record<string, string> }>();
  const data = { ...(attendee?.data ?? {}) };
  if (nameKey) data[nameKey] = name;

  const { error } = await db
    .from("attendees")
    .update({ name_value: name, data })
    .eq("id", attendeeId)
    .eq("event_id", eventId);
  if (error) {
    if (error.code === "23505") return { error: "Nama ini sudah wujud dalam program." };
    return { error: error.message };
  }
  revalidatePath(`/admin/events/${eventId}`);
  return { ok: true };
}

/**
 * Import senarai peserta secara pukal. Digunakan apabila sijil perlu dijana
 * tanpa peserta mengisi borang.
 *
 * Dua mod dalam satu kotak, dikesan setiap baris:
 *  - Satu lajur (tiada Tab): baris itu = nama sahaja.
 *  - Berbilang lajur (dipisah Tab, cth. salin terus dari Excel/Sheets): setiap
 *    lajur dipetakan ke `form_fields` MENGIKUT SUSUNAN medan program ini —
 *    jadi lajur sekolah / medan khas mengikut program boleh diimport sekali.
 *
 * Peserta sedia ada (padanan nama + IC) dilangkau supaya import boleh diulang.
 */
export async function importAttendees(eventId: string, rawText: string) {
  await requireUser();
  const db = adminClient();
  const { data: event } = await db
    .from("events")
    .select("id, form_fields")
    .eq("id", eventId)
    .single<{ id: string; form_fields: FormField[] }>();
  if (!event) return { error: "Program tidak ditemui." };

  const fields = event.form_fields ?? [];
  const nameField = fields.find((f) => f.role === "name");
  if (!nameField) return { error: "Program ini tiada medan nama untuk sijil." };
  const icField = fields.find((f) => f.role === "ic");

  const lines = rawText.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return { error: "Tiada baris untuk diimport." };
  if (lines.length > 2000) return { error: "Terlalu banyak baris (maksimum 2000)." };

  interface Parsed {
    name: string;
    ic: string | null;
    data: Record<string, string>;
    key: string;
  }

  const seen = new Set<string>();
  const parsed: Parsed[] = [];
  for (const line of lines) {
    const cells = line.split("\t").map((c) => c.trim());
    const data: Record<string, string> = {};
    if (cells.length === 1) {
      // Mod satu lajur — nama sahaja (tak kira kedudukan medan nama).
      data[nameField.key] = cells[0];
    } else {
      // Mod berbilang lajur — petakan ikut susunan medan borang.
      fields.forEach((f, i) => {
        data[f.key] = cells[i] ?? "";
      });
    }
    const name = (data[nameField.key] ?? "").trim();
    data[nameField.key] = name;
    if (!name) continue; // baris tanpa nama dilangkau
    if (name.length > 300) {
      return { error: `Nama terlalu panjang: "${name.slice(0, 40)}…"` };
    }
    const ic = icField ? normalizeIc(data[icField.key] ?? "") || null : null;
    const key = `${name.toLowerCase()} ${ic ?? ""}`;
    if (seen.has(key)) continue; // pendua dalam input
    seen.add(key);
    parsed.push({ name, ic, data, key });
  }

  // Buang peserta yang sudah wujud dalam program (padanan nama + IC)
  const { data: existing } = await db
    .from("attendees")
    .select("name_value, ic_value")
    .eq("event_id", eventId);
  const existingSet = new Set(
    (existing ?? []).map((r) => `${r.name_value.toLowerCase()} ${r.ic_value ?? ""}`),
  );
  const toInsert = parsed.filter((r) => !existingSet.has(r.key));

  if (toInsert.length) {
    const rows = toInsert.map((r) => ({
      event_id: eventId,
      data: r.data,
      name_value: r.name,
      ic_value: r.ic,
    }));
    const { error } = await db.from("attendees").insert(rows);
    if (error) return { error: error.message };
  }

  revalidatePath(`/admin/events/${eventId}`);
  return { added: toInsert.length, skipped: lines.length - toInsert.length };
}

// ============ Templat ============

export async function createTemplate(formData: FormData) {
  await requireUser();
  const name = String(formData.get("name") || "").trim() || "Templat Baharu";
  const orientation = (String(formData.get("orientation") || "landscape") ||
    "landscape") as Orientation;
  const db = adminClient();
  const { data, error } = await db
    .from("templates")
    .insert({
      name,
      orientation,
      elements: [
        {
          id: newSlug(),
          source: "name",
          x: 0.5,
          y: 0.45,
          size: 32,
          font: "great-vibes",
          color: "#1a1a1a",
          align: "center",
        },
      ],
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  redirect(`/admin/templates/${data.id}`);
}

export async function updateTemplate(
  id: string,
  payload: { name: string; orientation: Orientation; elements: TemplateElement[] },
) {
  await requireUser();
  const db = adminClient();
  const { error } = await db.from("templates").update(payload).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/admin/templates/${id}`);
  return { ok: true };
}

export async function uploadTemplateBg(id: string, formData: FormData) {
  await requireUser();
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "Tiada fail dipilih" };
  if (file.size > 5 * 1024 * 1024) return { error: "Saiz imej mestilah bawah 5 MB" };
  const ext = file.type === "image/png" ? "png" : file.type === "image/jpeg" ? "jpg" : null;
  if (!ext) return { error: "Hanya imej PNG atau JPG dibenarkan" };

  const db = adminClient();
  const path = `${id}/${Date.now()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: upErr } = await db.storage
    .from("templates")
    .upload(path, bytes, { contentType: file.type, upsert: false });
  if (upErr) return { error: upErr.message };

  // Padam imej lama jika ada
  const { data: tpl } = await db.from("templates").select("bg_image_path").eq("id", id).single();
  if (tpl?.bg_image_path) {
    await db.storage.from("templates").remove([tpl.bg_image_path]);
  }
  const { error } = await db.from("templates").update({ bg_image_path: path }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/admin/templates/${id}`);
  return { ok: true, path };
}

export async function duplicateTemplate(id: string) {
  await requireUser();
  const db = adminClient();
  const { data: tpl, error: getErr } = await db.from("templates").select("*").eq("id", id).single<Template>();
  if (getErr || !tpl) throw new Error(getErr?.message || "Templat tidak ditemui");
  if (tpl.owner_event_id) {
    throw new Error("Templat khas program tidak boleh disalin di sini. Gunakan templat induk.");
  }

  const { data: created, error } = await db
    .from("templates")
    .insert({
      name: `${tpl.name} (salinan)`,
      orientation: tpl.orientation,
      elements: tpl.elements,
      bg_image_path: null,
      owner_event_id: null,
      source_template_id: tpl.id,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  if (tpl.bg_image_path) {
    const newPath = `${created.id}/${Date.now()}.${tpl.bg_image_path.split(".").pop()}`;
    const { error: cpErr } = await db.storage.from("templates").copy(tpl.bg_image_path, newPath);
    if (!cpErr) {
      await db.from("templates").update({ bg_image_path: newPath }).eq("id", created.id);
    }
  }
  redirect(`/admin/templates/${created.id}`);
}

export async function deleteTemplate(id: string) {
  await requireUser();
  const db = adminClient();
  const { data: tpl } = await db
    .from("templates")
    .select("bg_image_path, owner_event_id, source_template_id")
    .eq("id", id)
    .single<Pick<Template, "bg_image_path" | "owner_event_id" | "source_template_id">>();
  const ownerEventId = tpl?.owner_event_id ?? null;
  const sourceTemplateId = tpl?.source_template_id ?? null;

  // Pulihkan rujukan program ke templat induk sebelum padam salinan khas.
  if (ownerEventId) {
    await db
      .from("events")
      .update({ template_id: sourceTemplateId })
      .eq("id", ownerEventId)
      .eq("template_id", id);
  }

  if (tpl?.bg_image_path) {
    await db.storage.from("templates").remove([tpl.bg_image_path]);
  }
  const { error } = await db.from("templates").delete().eq("id", id);
  if (error) throw new Error(error.message);
  if (ownerEventId) {
    revalidatePath(`/admin/events/${ownerEventId}`);
    redirect(`/admin/events/${ownerEventId}/edit`);
  }
  redirect("/admin/templates");
}

// ============ Sesi ============

export async function loginAdmin(_prev: { error?: string } | null, formData: FormData) {
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/admin");
  if (!passwordMatches(password)) {
    return { error: "Kata laluan tidak sah." };
  }
  const store = await cookies();
  store.set(ADMIN_COOKIE, await adminToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 hari
  });
  // Elak open-redirect — hanya benarkan laluan dalaman /admin
  redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function signOut() {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
  redirect("/login");
}
