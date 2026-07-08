import { NextResponse } from "next/server";
import JSZip from "jszip";
import { adminClient } from "@/lib/supabase/admin";
import { generateSijil } from "@/lib/pdf";
import { attendeeValues, loadSijilContext, safeFilename } from "@/lib/sijil-data";
import type { Attendee, EventRow } from "@/lib/types";

export const maxDuration = 60;

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const db = adminClient();
  const { data: event } = await db.from("events").select("*").eq("id", id).single<EventRow>();
  if (!event) return NextResponse.json({ error: "Majlis tidak ditemui." }, { status: 404 });

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

  const zip = new JSZip();
  const used = new Set<string>();
  for (const a of attendees) {
    const pdf = await generateSijil(sijilCtx.template, sijilCtx.bgBytes, attendeeValues(event, a));
    const base = `Sijil_${safeFilename(a.name_value)}`;
    let filename = `${base}.pdf`;
    for (let n = 2; used.has(filename); n++) filename = `${base}_${n}.pdf`;
    used.add(filename);
    zip.file(filename, pdf);
  }
  const bytes = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="Sijil_${safeFilename(event.title)}.zip"`,
    },
  });
}
