import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { suggestCertificateNames } from "@/lib/certificate-search";
import type { EventRow } from "@/lib/types";

export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const query = req.nextUrl.searchParams.get("q") ?? "";
  if (query.trim().length < 3) return NextResponse.json({ names: [] });

  const db = adminClient();
  const { data: event } = await db
    .from("events")
    .select("id, status")
    .eq("slug", slug)
    .single<Pick<EventRow, "id" | "status">>();
  if (!event || event.status !== "released") return NextResponse.json({ names: [] });

  const { data } = await db
    .from("attendees")
    .select("name_value")
    .eq("event_id", event.id);
  return NextResponse.json({ names: suggestCertificateNames((data ?? []).map((row) => row.name_value), query) });
}
