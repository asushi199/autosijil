import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { generateCombinedSijil } from "@/lib/pdf";
import { attendeeValues, loadSijilContext, safeFilename } from "@/lib/sijil-data";
import type { Attendee, EventRow } from "@/lib/types";

export const maxDuration = 60;

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const db = adminClient();
  const { data: event } = await db.from("events").select("*").eq("id", id).single<EventRow>();
  if (!event) return NextResponse.json({ error: "Program tidak ditemui." }, { status: 404 });

  const sijilCtx = await loadSijilContext(event);
  if ("error" in sijilCtx) return NextResponse.json({ error: sijilCtx.error }, { status: 400 });

  const { data: attendees } = await db
    .from("attendees")
    .select("*")
    .eq("event_id", id)
    .order("name_value", { ascending: true })
    .returns<Attendee[]>();
  if (!attendees?.length) {
    return NextResponse.json({ error: "Tiada peserta lagi." }, { status: 400 });
  }

  const pdf = await generateCombinedSijil(
    sijilCtx.template,
    sijilCtx.bgBytes,
    attendees.map((a) => attendeeValues(event, a, sijilCtx.template, sijilCtx.schools)),
  );

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Sijil_Semua_${safeFilename(event.title)}.pdf"`,
    },
  });
}
