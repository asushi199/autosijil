import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { generateSijil } from "@/lib/pdf";
import { attendeeValues, loadSijilContext, safeFilename } from "@/lib/sijil-data";
import type { Attendee, EventRow } from "@/lib/types";

// Muat turun sijil seorang peserta (untuk admin) — tanpa mengira status program.
// Berguna untuk membekalkan sijil secara manual (cth. peserta nama sama yang
// tidak dapat menyemak sendiri di pautan awam). Dilindungi oleh proxy admin.
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const attendeeId = req.nextUrl.searchParams.get("attendee") ?? "";
  if (!attendeeId) {
    return NextResponse.json({ error: "Peserta tidak dinyatakan." }, { status: 400 });
  }

  const db = adminClient();
  const { data: event } = await db.from("events").select("*").eq("id", id).single<EventRow>();
  if (!event) return NextResponse.json({ error: "Program tidak ditemui." }, { status: 404 });

  const { data: attendee } = await db
    .from("attendees")
    .select("*")
    .eq("id", attendeeId)
    .eq("event_id", id)
    .single<Attendee>();
  if (!attendee) return NextResponse.json({ error: "Peserta tidak ditemui." }, { status: 404 });

  const sijilCtx = await loadSijilContext(event);
  if ("error" in sijilCtx) return NextResponse.json({ error: sijilCtx.error }, { status: 400 });

  const pdf = await generateSijil(sijilCtx.template, sijilCtx.bgBytes, attendeeValues(event, attendee, sijilCtx.template));
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Sijil_${safeFilename(attendee.name_value)}.pdf"`,
    },
  });
}
