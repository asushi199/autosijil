import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { validateSubmission } from "@/lib/form-submission";
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

  let body: { data?: Record<string, unknown> };
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

  const { error } = await db
    .from("attendees")
    .insert({ event_id: event.id, data: result.data, name_value: result.name, ic_value: result.ic });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Kehadiran anda telah pun direkodkan sebelum ini." },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "Ralat pelayan. Sila cuba lagi." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
