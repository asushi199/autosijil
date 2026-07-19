import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { generateSijil } from "@/lib/pdf";
import { attendeeValues, loadSijilContext, safeFilename } from "@/lib/sijil-data";
import { verifySijilToken } from "@/lib/token";
import type { Attendee, EventRow } from "@/lib/types";

export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const id = req.nextUrl.searchParams.get("id") ?? "";
  const token = req.nextUrl.searchParams.get("token") ?? "";
  if (!id || !token || !verifySijilToken(id, token)) {
    return NextResponse.json({ error: "Pautan tidak sah." }, { status: 403 });
  }

  const db = adminClient();
  const { data: event } = await db
    .from("events")
    .select("*")
    .eq("slug", slug)
    .single<EventRow>();
  if (!event) return NextResponse.json({ error: "Program tidak ditemui." }, { status: 404 });
  if (event.status !== "released") {
    return NextResponse.json({ error: "Sijil belum dibuka untuk muat turun." }, { status: 403 });
  }

  const { data: attendee } = await db
    .from("attendees")
    .select("*")
    .eq("id", id)
    .eq("event_id", event.id)
    .single<Attendee>();
  if (!attendee) return NextResponse.json({ error: "Rekod tidak ditemui." }, { status: 404 });

  const ctx2 = await loadSijilContext(event);
  if ("error" in ctx2) return NextResponse.json({ error: ctx2.error }, { status: 500 });

  const pdf = await generateSijil(ctx2.template, ctx2.bgBytes, attendeeValues(event, attendee, ctx2.template));
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Sijil_${safeFilename(attendee.name_value)}.pdf"`,
    },
  });
}
