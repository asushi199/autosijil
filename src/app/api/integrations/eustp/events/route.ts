import { NextResponse } from "next/server";
import { assertEustpIntegrationAuth } from "@/lib/integration-auth";
import { adminClient } from "@/lib/supabase/admin";
import { newSlug } from "@/lib/slug";
import type { FormField } from "@/lib/types";

export const runtime = "nodejs";

const DEFAULT_FIELDS: FormField[] = [
  { key: "nama", label: "Nama Penuh", type: "text", required: true, role: "name" },
  { key: "sekolah", label: "Sekolah / Unit", type: "text", required: true },
];

type CreateBody = {
  externalBookingId?: string;
  title?: string;
  eventDate?: string | null;
  eventEndDate?: string | null;
  sessions?: Array<{ date?: string; slot?: "am" | "pm" | "full_day" }>;
  location?: string | null;
  requiresCertificate?: boolean;
  description?: string | null;
  pkgId?: string;
  slot?: string;
};

function validDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function normaliseSessions(body: CreateBody) {
  const source = body.sessions ?? (validDate(body.eventDate) ? [{ date: body.eventDate, slot: "full_day" as const }] : []);
  return source
    .filter((row) => validDate(row.date) && ["am", "pm", "full_day"].includes(row.slot ?? ""))
    .map((row) => ({ session_date: row.date!, slot: row.slot! }));
}

function appBaseUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
}

function urlsFor(eventId: string, slug: string) {
  const base = appBaseUrl();
  return {
    publicUrl: `${base}/e/${slug}`,
    adminUrl: `${base}/admin/events/${eventId}`,
  };
}

export async function POST(req: Request) {
  if (!assertEustpIntegrationAuth(req)) {
    return NextResponse.json({ error: "Tidak dibenarkan" }, { status: 401 });
  }

  let body: CreateBody;
  try {
    body = (await req.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: "JSON tidak sah" }, { status: 400 });
  }

  const externalBookingId = String(body.externalBookingId ?? "").trim();
  const title = String(body.title ?? "").trim();
  if (!externalBookingId) {
    return NextResponse.json({ error: "externalBookingId diperlukan" }, { status: 400 });
  }
  if (!title) {
    return NextResponse.json({ error: "title diperlukan" }, { status: 400 });
  }

  const requiresCertificate = Boolean(body.requiresCertificate);
  const eventDate = body.eventDate ? String(body.eventDate).trim() || null : null;
  const eventEndDate = body.eventEndDate ? String(body.eventEndDate).trim() || null : eventDate;
  const location = body.location ? String(body.location).trim() || null : null;
  const description = body.description ? String(body.description).trim() || null : null;
  const sessions = normaliseSessions(body);
  if (eventDate && !sessions.length) {
    return NextResponse.json({ error: "Sesi program tidak sah" }, { status: 400 });
  }

  const db = adminClient();

  const { data: existing, error: findError } = await db
    .from("events")
    .select("id, slug")
    .eq("external_source", "eustp")
    .eq("external_booking_id", externalBookingId)
    .maybeSingle();

  if (findError) {
    return NextResponse.json({ error: findError.message }, { status: 500 });
  }

  if (existing) {
    const links = urlsFor(existing.id, existing.slug);
    return NextResponse.json({
      eventId: existing.id,
      slug: existing.slug,
      ...links,
    });
  }

  const slug = newSlug();
  const { data: created, error: insertError } = await db
    .from("events")
    .insert({
      slug,
      title,
      description,
      event_date: eventDate,
      event_end_date: eventEndDate,
      location,
      status: "open",
      form_fields: DEFAULT_FIELDS,
      requires_certificate: requiresCertificate,
      certificate_field_mappings: {},
      template_id: null,
      external_source: "eustp",
      external_booking_id: externalBookingId,
      created_by: null,
    })
    .select("id, slug")
    .single();

  if (insertError) {
    // Race: unique index — cuba baca semula
    if (insertError.code === "23505") {
      const { data: raced } = await db
        .from("events")
        .select("id, slug")
        .eq("external_source", "eustp")
        .eq("external_booking_id", externalBookingId)
        .maybeSingle();
      if (raced) {
        const links = urlsFor(raced.id, raced.slug);
        return NextResponse.json({
          eventId: raced.id,
          slug: raced.slug,
          ...links,
        });
      }
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  if (sessions.length) {
    const { error: sessionError } = await db
      .from("event_sessions")
      .insert(sessions.map((session) => ({ event_id: created.id, ...session })));
    if (sessionError) return NextResponse.json({ error: sessionError.message }, { status: 500 });
  }

  const links = urlsFor(created.id, created.slug);
  return NextResponse.json({
    eventId: created.id,
    slug: created.slug,
    ...links,
  });
}

type UpdateBody = {
  externalBookingId?: string;
  title?: string;
  eventDate?: string | null;
  eventEndDate?: string | null;
  sessions?: Array<{ date?: string; slot?: "am" | "pm" | "full_day" }>;
  location?: string | null;
  requiresCertificate?: boolean;
  description?: string | null;
};

export async function PATCH(req: Request) {
  if (!assertEustpIntegrationAuth(req)) {
    return NextResponse.json({ error: "Tidak dibenarkan" }, { status: 401 });
  }

  let body: UpdateBody;
  try {
    body = (await req.json()) as UpdateBody;
  } catch {
    return NextResponse.json({ error: "JSON tidak sah" }, { status: 400 });
  }

  const externalBookingId = String(body.externalBookingId ?? "").trim();
  if (!externalBookingId) {
    return NextResponse.json({ error: "externalBookingId diperlukan" }, { status: 400 });
  }

  const db = adminClient();
  const { data: existing, error: findError } = await db
    .from("events")
    .select("id, slug")
    .eq("external_source", "eustp")
    .eq("external_booking_id", externalBookingId)
    .maybeSingle();

  if (findError) {
    return NextResponse.json({ error: findError.message }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "Event tidak dijumpai" }, { status: 404 });
  }

  const patch: Record<string, string | boolean | null> = {};
  if (body.title !== undefined) {
    const title = String(body.title ?? "").trim();
    if (!title) {
      return NextResponse.json({ error: "title tidak boleh kosong" }, { status: 400 });
    }
    patch.title = title;
  }
  if (body.eventDate !== undefined) {
    patch.event_date = body.eventDate ? String(body.eventDate).trim() || null : null;
  }
  if (body.eventEndDate !== undefined) {
    patch.event_end_date = body.eventEndDate ? String(body.eventEndDate).trim() || null : null;
  }
  if (body.location !== undefined) {
    patch.location = body.location ? String(body.location).trim() || null : null;
  }
  if (body.description !== undefined) {
    patch.description = body.description ? String(body.description).trim() || null : null;
  }
  if (body.requiresCertificate !== undefined) {
    patch.requires_certificate = body.requiresCertificate;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Tiada medan untuk dikemas kini" }, { status: 400 });
  }

  const { error: updateError } = await db.from("events").update(patch).eq("id", existing.id);
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (body.sessions !== undefined) {
    const sessions = normaliseSessions(body);
    if (!sessions.length) return NextResponse.json({ error: "Sesi program tidak sah" }, { status: 400 });
    const { error: deleteError } = await db.from("event_sessions").delete().eq("event_id", existing.id);
    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });
    const { error: sessionError } = await db
      .from("event_sessions")
      .insert(sessions.map((session) => ({ event_id: existing.id, ...session })));
    if (sessionError) return NextResponse.json({ error: sessionError.message }, { status: 500 });
  }

  const links = urlsFor(existing.id, existing.slug);
  return NextResponse.json({
    eventId: existing.id,
    slug: existing.slug,
    ...links,
  });
}
