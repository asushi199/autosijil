import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { normalizeIc } from "@/lib/sijil-data";
import { sijilToken } from "@/lib/token";
import type { EventRow } from "@/lib/types";

export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const db = adminClient();
  const { data: event } = await db
    .from("events")
    .select("id, status")
    .eq("slug", slug)
    .single<Pick<EventRow, "id" | "status">>();

  if (!event) return NextResponse.json({ error: "Majlis tidak ditemui." }, { status: 404 });
  if (event.status !== "released") {
    return NextResponse.json({ error: "Sijil belum dibuka untuk muat turun." }, { status: 403 });
  }

  let body: { query?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Permintaan tidak sah." }, { status: 400 });
  }
  const query = (body.query ?? "").trim();
  if (query.length < 3) {
    return NextResponse.json({ error: "Sila masukkan nama penuh atau no. KP." }, { status: 400 });
  }

  // Cuba padan IC dahulu (jika input kelihatan seperti nombor), kemudian nama penuh
  const icQuery = normalizeIc(query);
  const looksLikeIc = /^\d{6,}$/.test(icQuery);

  let matches: { id: string; name_value: string }[] = [];
  if (looksLikeIc) {
    const { data } = await db
      .from("attendees")
      .select("id, name_value")
      .eq("event_id", event.id)
      .eq("ic_value", icQuery)
      .limit(3);
    matches = data ?? [];
  }
  if (!matches.length) {
    const { data } = await db
      .from("attendees")
      .select("id, name_value")
      .eq("event_id", event.id)
      .ilike("name_value", query)
      .limit(3);
    matches = data ?? [];
  }

  if (!matches.length) {
    return NextResponse.json(
      {
        error:
          "Tiada rekod ditemui. Pastikan ejaan nama sama seperti yang diisi semasa kehadiran, atau cuba no. KP.",
      },
      { status: 404 },
    );
  }
  if (matches.length > 1) {
    return NextResponse.json(
      { error: "Terdapat lebih daripada satu rekod dengan nama ini. Sila semak menggunakan no. KP." },
      { status: 409 },
    );
  }

  const m = matches[0];
  return NextResponse.json({ id: m.id, token: sijilToken(m.id), name: m.name_value });
}
