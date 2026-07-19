import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { safeFilename } from "@/lib/sijil-data";
import { formatFieldValue, type SchoolDirectoryEntry } from "@/lib/school-directory";
import type { Attendee, EventRow } from "@/lib/types";

function csvCell(s: string): string {
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const db = adminClient();
  const { data: event } = await db.from("events").select("*").eq("id", id).single<EventRow>();
  if (!event) return NextResponse.json({ error: "Program tidak ditemui." }, { status: 404 });

  const { data: attendees } = await db
    .from("attendees")
    .select("*")
    .eq("event_id", id)
    .order("created_at", { ascending: true })
    .returns<Attendee[]>();

  const fields = event.form_fields ?? [];
  const schools: SchoolDirectoryEntry[] = fields.some((field) => field.type === "school")
    ? ((await db.from("school_directory").select("code, name, zone").order("name")).data ?? []) as SchoolDirectoryEntry[]
    : [];
  const header = ["Bil", ...fields.map((f) => f.label), "Masa Daftar"];
  const rows = (attendees ?? []).map((a, i) => [
    String(i + 1),
    ...fields.map((f) => formatFieldValue(f, a.data?.[f.key], schools)),
    new Date(a.created_at).toLocaleString("ms-MY"),
  ]);
  // ﻿ (BOM) supaya Excel membuka fail sebagai UTF-8
  const csv =
    "﻿" + [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="Kehadiran_${safeFilename(event.title)}.csv"`,
    },
  });
}
