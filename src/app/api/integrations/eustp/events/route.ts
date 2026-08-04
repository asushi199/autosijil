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
  location?: string | null;
  requiresCertificate?: boolean;
  description?: string | null;
  pkgId?: string;
  slot?: string;
};

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
  const location = body.location ? String(body.location).trim() || null : null;
  const description = body.description ? String(body.description).trim() || null : null;

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

  const links = urlsFor(created.id, created.slug);
  return NextResponse.json({
    eventId: created.id,
    slug: created.slug,
    ...links,
  });
}
