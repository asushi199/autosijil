import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { formatTarikh, generateSijil } from "@/lib/pdf";
import { loadSijilContext } from "@/lib/sijil-data";
import type { EventRow } from "@/lib/types";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const db = adminClient();
  const { data: event } = await db.from("events").select("*").eq("id", id).single<EventRow>();
  if (!event) return NextResponse.json({ error: "Majlis tidak ditemui." }, { status: 404 });

  const sijilCtx = await loadSijilContext(event);
  if ("error" in sijilCtx) return NextResponse.json({ error: sijilCtx.error }, { status: 400 });

  const pdf = await generateSijil(sijilCtx.template, sijilCtx.bgBytes, {
    name: "Ahmad Danial bin Abdullah",
    ic: "900101-08-1234",
    eventName: event.title,
    eventDate: formatTarikh(event.event_date),
  });

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Pratonton_Sijil.pdf"`,
    },
  });
}
