"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminClient } from "@/lib/supabase/admin";
import { createClient, getUser } from "@/lib/supabase/server";
import { newSlug } from "@/lib/slug";
import type { EventStatus, FormField, Orientation, TemplateElement } from "@/lib/types";

async function requireUser() {
  const user = await getUser();
  if (!user) throw new Error("Tidak dibenarkan");
  return user;
}

// ============ Majlis ============

const DEFAULT_FIELDS: FormField[] = [
  { key: "nama", label: "Nama Penuh", type: "text", required: true, role: "name" },
  { key: "sekolah", label: "Sekolah / Unit", type: "text", required: true },
];

export async function createEvent(formData: FormData) {
  const user = await requireUser();
  const title = String(formData.get("title") || "").trim();
  if (!title) throw new Error("Nama majlis diperlukan");
  const db = adminClient();
  const { data, error } = await db
    .from("events")
    .insert({
      slug: newSlug(),
      title,
      event_date: String(formData.get("event_date") || "") || null,
      location: String(formData.get("location") || "").trim() || null,
      form_fields: DEFAULT_FIELDS,
      created_by: user.id,
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
  if (!payload.title.trim()) return { error: "Nama majlis diperlukan" };
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

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
