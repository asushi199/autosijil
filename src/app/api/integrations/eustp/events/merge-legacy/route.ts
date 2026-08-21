import { NextResponse } from "next/server";
import { assertEustpIntegrationAuth } from "@/lib/integration-auth";
import { adminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type SourceEvent = {
  eventId?: string;
  sessionDate?: string;
  slot?: "am" | "pm" | "full_day";
};

function normaliseName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("ms-MY");
}

function validDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function POST(req: Request) {
  if (!assertEustpIntegrationAuth(req)) {
    return NextResponse.json({ error: "Tidak dibenarkan" }, { status: 401 });
  }

  let body: { externalBookingId?: string; sourceEvents?: SourceEvent[] };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON tidak sah" }, { status: 400 });
  }

  const externalBookingId = String(body.externalBookingId ?? "").trim();
  const sourceEvents = body.sourceEvents ?? [];
  if (!externalBookingId || !sourceEvents.length) {
    return NextResponse.json({ error: "Butiran gabungan tidak lengkap" }, { status: 400 });
  }
  if (
    sourceEvents.some(
      (source) =>
        !source.eventId ||
        !validDate(source.sessionDate) ||
        !["am", "pm", "full_day"].includes(source.slot ?? ""),
    )
  ) {
    return NextResponse.json({ error: "Sesi sumber tidak sah" }, { status: 400 });
  }

  const db = adminClient();
  const { data: target, error: targetError } = await db
    .from("events")
    .select("id")
    .eq("external_source", "eustp")
    .eq("external_booking_id", externalBookingId)
    .maybeSingle();
  if (targetError || !target) {
    return NextResponse.json({ error: targetError?.message ?? "Event baharu tidak dijumpai" }, { status: 404 });
  }

  const sourceByEvent = new Map(sourceEvents.map((source) => [source.eventId!, source]));
  const sourceIds = [...sourceByEvent.keys()].filter((id) => id !== target.id);
  if (!sourceIds.length) return NextResponse.json({ mergedEvents: 0, migratedAttendances: 0 });

  const { data: sessions, error: sessionsError } = await db
    .from("event_sessions")
    .select("id, session_date, slot")
    .eq("event_id", target.id);
  if (sessionsError) return NextResponse.json({ error: sessionsError.message }, { status: 500 });
  const sessionByKey = new Map((sessions ?? []).map((session) => [`${session.session_date}:${session.slot}`, session.id]));

  for (const source of sourceEvents) {
    if (!sessionByKey.has(`${source.sessionDate}:${source.slot}`)) {
      return NextResponse.json({ error: "Sesi event baharu tidak sepadan" }, { status: 400 });
    }
  }

  const [{ data: targetAttendees, error: targetAttendeesError }, { data: sourceAttendees, error: sourceAttendeesError }] =
    await Promise.all([
      db.from("attendees").select("id, name_value").eq("event_id", target.id),
      db.from("attendees").select("id, event_id, data, name_value, ic_value, created_at").in("event_id", sourceIds),
    ]);
  if (targetAttendeesError || sourceAttendeesError) {
    return NextResponse.json({ error: targetAttendeesError?.message ?? sourceAttendeesError?.message ?? "Gagal membaca kehadiran" }, { status: 500 });
  }

  const targetAttendeeByName = new Map(
    (targetAttendees ?? []).map((attendee) => [normaliseName(attendee.name_value), attendee.id]),
  );
  let migratedAttendances = 0;

  for (const sourceAttendee of sourceAttendees ?? []) {
    const source = sourceByEvent.get(sourceAttendee.event_id);
    if (!source) continue;
    const name = normaliseName(sourceAttendee.name_value);
    if (!name) continue;

    let targetAttendeeId = targetAttendeeByName.get(name);
    if (!targetAttendeeId) {
      const { data: created, error: createError } = await db
        .from("attendees")
        .insert({
          event_id: target.id,
          data: sourceAttendee.data,
          name_value: sourceAttendee.name_value,
          ic_value: sourceAttendee.ic_value,
          created_at: sourceAttendee.created_at,
        })
        .select("id")
        .single();
      if (createError || !created) {
        return NextResponse.json({ error: createError?.message ?? "Gagal memindahkan peserta" }, { status: 500 });
      }
      targetAttendeeId = created.id;
      targetAttendeeByName.set(name, targetAttendeeId);
    }

    const sessionId = sessionByKey.get(`${source.sessionDate}:${source.slot}`)!;
    const { error: attendanceError } = await db.from("session_attendances").upsert(
      {
        session_id: sessionId,
        attendee_id: targetAttendeeId,
        method: "admin",
        recorded_at: sourceAttendee.created_at,
      },
      { onConflict: "session_id,attendee_id", ignoreDuplicates: true },
    );
    if (attendanceError) return NextResponse.json({ error: attendanceError.message }, { status: 500 });
    migratedAttendances += 1;
  }

  // Peserta dipindahkan dahulu; cascade akan membuang salinan lama bersama event lama.
  const { error: deleteError } = await db.from("events").delete().in("id", sourceIds);
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

  return NextResponse.json({ mergedEvents: sourceIds.length, migratedAttendances });
}
