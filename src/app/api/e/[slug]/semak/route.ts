import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { sijilToken } from "@/lib/token";
import { normalizeName } from "@/lib/sijil-data";
import type { EventRow } from "@/lib/types";

export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const db = adminClient();
  const { data: event } = await db
    .from("events")
    .select("id, status")
    .eq("slug", slug)
    .single<Pick<EventRow, "id" | "status">>();

  if (!event) return NextResponse.json({ error: "Program tidak ditemui." }, { status: 404 });
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
  if (query.length < 2) {
    return NextResponse.json({ error: "Sila masukkan nama penuh anda." }, { status: 400 });
  }

  // Padanan mengikut nama penuh — tidak sensitif huruf besar/kecil DAN
  // tahan ruang berlebihan (cth. dua ruang antara perkataan). Bandingkan nama
  // yang dinormalisasi supaya salah taip ruang tidak menyebabkan "tiada rekod".
  const q = normalizeName(query);
  const { data } = await db
    .from("attendees")
    .select("id, name_value")
    .eq("event_id", event.id);
  const matches = (data ?? []).filter((r) => normalizeName(r.name_value) === q);

  if (!matches.length) {
    return NextResponse.json(
      {
        error:
          "Tiada rekod ditemui. Pastikan ejaan nama sama seperti yang diisi semasa merekod kehadiran.",
      },
      { status: 404 },
    );
  }
  if (matches.length > 1) {
    return NextResponse.json(
      {
        error:
          "Terdapat lebih daripada satu rekod dengan nama yang sama. Sila hubungi urus setia program.",
      },
      { status: 409 },
    );
  }

  const m = matches[0];
  return NextResponse.json({ id: m.id, token: sijilToken(m.id), name: m.name_value });
}
