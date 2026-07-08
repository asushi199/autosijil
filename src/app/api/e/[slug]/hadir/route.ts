import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { extractRoles } from "@/lib/sijil-data";
import type { EventRow } from "@/lib/types";

export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const db = adminClient();
  const { data: event } = await db
    .from("events")
    .select("id, status, form_fields")
    .eq("slug", slug)
    .single<Pick<EventRow, "id" | "status" | "form_fields">>();

  if (!event) return NextResponse.json({ error: "Majlis tidak ditemui." }, { status: 404 });
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
  const raw = body.data ?? {};
  const data: Record<string, string> = {};
  for (const f of fields) {
    const v = typeof raw[f.key] === "string" ? (raw[f.key] as string).trim() : "";
    if (f.required && !v) {
      return NextResponse.json({ error: `Medan "${f.label}" wajib diisi.` }, { status: 400 });
    }
    if (v.length > 300) {
      return NextResponse.json({ error: `Medan "${f.label}" terlalu panjang.` }, { status: 400 });
    }
    data[f.key] = v;
  }

  const { name, ic } = extractRoles(fields, data);
  if (!name) return NextResponse.json({ error: "Nama diperlukan." }, { status: 400 });

  const { error } = await db
    .from("attendees")
    .insert({ event_id: event.id, data, name_value: name, ic_value: ic });

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
