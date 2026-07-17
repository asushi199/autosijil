"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { adminClient } from "@/lib/supabase/admin";
import { ADMIN_COOKIE, adminToken, isAuthedCookie, passwordMatches } from "@/lib/admin-auth";
import { newSlug } from "@/lib/slug";
import type { EventStatus, FormField, Orientation, TemplateElement } from "@/lib/types";

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
  revalidatePath(`/admin/events/${id}`);
  return { ok: true };
}

export async function updateEventStatus(id: string, status: EventStatus) {
  await requireUser();
  const db = adminClient();
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
 * Import senarai peserta secara pukal — satu nama satu baris.
 * Digunakan apabila sijil perlu dijana tanpa peserta mengisi borang.
 * Nama yang sudah wujud (tak sensitif huruf besar/kecil) dilangkau.
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

  const nameField = (event.form_fields ?? []).find((f) => f.role === "name");
  if (!nameField) return { error: "Program ini tiada medan nama untuk sijil." };

  const names = rawText
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (!names.length) return { error: "Tiada nama untuk diimport." };
  if (names.length > 2000) return { error: "Terlalu banyak baris (maksimum 2000)." };
  const tooLong = names.find((n) => n.length > 300);
  if (tooLong) return { error: `Nama terlalu panjang: "${tooLong.slice(0, 40)}…"` };

  // Buang pendua dalam input (tak sensitif huruf besar/kecil)
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const n of names) {
    const key = n.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(n);
    }
  }

  // Buang nama yang sudah wujud dalam program
  const { data: existing } = await db
    .from("attendees")
    .select("name_value")
    .eq("event_id", eventId);
  const existingSet = new Set((existing ?? []).map((r) => r.name_value.toLowerCase()));
  const toInsert = unique.filter((n) => !existingSet.has(n.toLowerCase()));

  if (toInsert.length) {
    const rows = toInsert.map((n) => ({
      event_id: eventId,
      data: { [nameField.key]: n },
      name_value: n,
      ic_value: null,
    }));
    const { error } = await db.from("attendees").insert(rows);
    if (error) return { error: error.message };
  }

  revalidatePath(`/admin/events/${eventId}`);
  return { added: toInsert.length, skipped: names.length - toInsert.length };
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
  const { data: tpl, error: getErr } = await db.from("templates").select("*").eq("id", id).single();
  if (getErr || !tpl) throw new Error(getErr?.message || "Templat tidak ditemui");

  let newPath: string | null = null;
  const { data: created, error } = await db
    .from("templates")
    .insert({
      name: `${tpl.name} (salinan)`,
      orientation: tpl.orientation,
      elements: tpl.elements,
      bg_image_path: null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  if (tpl.bg_image_path) {
    newPath = `${created.id}/${Date.now()}.${tpl.bg_image_path.split(".").pop()}`;
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
  const { data: tpl } = await db.from("templates").select("bg_image_path").eq("id", id).single();
  if (tpl?.bg_image_path) {
    await db.storage.from("templates").remove([tpl.bg_image_path]);
  }
  const { error } = await db.from("templates").delete().eq("id", id);
  if (error) throw new Error(error.message);
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
