import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { validateSubmission } from "@/lib/form-submission";
import { normalizeName } from "@/lib/sijil-data";
import type { EventRow } from "@/lib/types";

export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const db = adminClient();
  const { data: event } = await db
    .from("events")
    .select("id, status, form_fields")
    .eq("slug", slug)
    .single<Pick<EventRow, "id" | "status" | "form_fields">>();

  if (!event) return NextResponse.json({ error: "Program tidak ditemui." }, { status: 404 });
  if (event.status !== "open") {
    return NextResponse.json({ error: "Pendaftaran kehadiran telah ditutup." }, { status: 403 });
  }

  let body: { data?: Record<string, unknown>; makeupSessionIds?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Permintaan tidak sah." }, { status: 400 });
  }

  const fields = event.form_fields ?? [];
  let schoolCodes: ReadonlySet<string> | undefined;
  if (fields.some((field) => field.type === "school")) {
    const { data: schools, error } = await db.from("school_directory").select("code");
    if (error) return NextResponse.json({ error: "Direktori sekolah tidak dapat dimuatkan." }, { status: 500 });
    schoolCodes = new Set((schools ?? []).map((school) => school.code));
  }

  const result = validateSubmission(fields, body.data ?? {}, schoolCodes);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });

  const { data: sessions } = await db
    .from("event_sessions")
    .select("id, session_date, slot")
    .eq("event_id", event.id)
    .order("session_date");

  // Program lama tanpa sesi kekal menggunakan satu rekod kehadiran seperti asal.
  if (!sessions?.length) {
    const { error } = await db
      .from("attendees")
      .insert({ event_id: event.id, data: result.data, name_value: result.name, ic_value: result.ic });
    if (error) {
      if (error.code === "23505") return NextResponse.json({ error: "Kehadiran anda telah pun direkodkan sebelum ini." }, { status: 409 });
      return NextResponse.json({ error: "Ralat pelayan. Sila cuba lagi." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, makeupSessions: [] });
  }

  const { data: attendees } = await db
    .from("attendees")
    .select("id, name_value")
    .eq("event_id", event.id);
  const nameKey = normalizeName(result.name);
  let attendee = (attendees ?? []).find((row) => normalizeName(row.name_value) === nameKey) ?? null;
  if (!attendee) {
    const { data, error } = await db
      .from("attendees")
      .insert({ event_id: event.id, data: result.data, name_value: result.name, ic_value: result.ic })
      .select("id, name_value")
      .single();
    if (error || !data) return NextResponse.json({ error: error?.message ?? "Ralat pelayan." }, { status: 500 });
    attendee = data;
  }

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur", year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(new Date())
    .reduce<Record<string, string>>((out, part) => ({ ...out, [part.type]: part.value }), {});
  const todayIso = `${today.year}-${today.month}-${today.day}`;
  const selected = new Set(Array.isArray(body.makeupSessionIds) ? body.makeupSessionIds : []);
  const current = sessions.filter((session) => session.session_date === todayIso).map((session) => session.id);
  const allowedMakeup = new Set(sessions.filter((session) => session.session_date < todayIso).map((session) => session.id));
  const targetIds = [...new Set([...current, ...[...selected].filter((id) => allowedMakeup.has(id))])];

  if (targetIds.length) {
    const { error } = await db.from("session_attendances").upsert(
      targetIds.map((sessionId) => ({
        session_id: sessionId,
        attendee_id: attendee!.id,
        method: current.includes(sessionId) ? "self" : "self_makeup",
      })),
      { onConflict: "session_id,attendee_id", ignoreDuplicates: true },
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: recorded } = await db
    .from("session_attendances")
    .select("session_id")
    .eq("attendee_id", attendee.id);
  const recordedIds = new Set((recorded ?? []).map((row) => row.session_id));
  const makeupSessions = sessions
    .filter((session) => session.session_date < todayIso && !recordedIds.has(session.id))
    .map((session) => ({ id: session.id, date: session.session_date, slot: session.slot }));
  return NextResponse.json({ ok: true, makeupSessions });
}
