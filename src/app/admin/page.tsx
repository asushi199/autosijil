import Link from "next/link";
import { adminClient } from "@/lib/supabase/admin";
import type { EventRow } from "@/lib/types";
import EventList, { type EventRowLite } from "./EventList";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const db = adminClient();
  const { data: events } = await db
    .from("events")
    .select("id, slug, title, event_date, status, created_at")
    .order("created_at", { ascending: false });

  const { data: counts } = await db.from("attendees").select("event_id");
  const countMap = new Map<string, number>();
  for (const row of counts ?? []) {
    countMap.set(row.event_id, (countMap.get(row.event_id) ?? 0) + 1);
  }

  const rows: EventRowLite[] = (
    (events ?? []) as Pick<EventRow, "id" | "title" | "event_date" | "status">[]
  ).map((ev) => ({
    id: ev.id,
    title: ev.title,
    event_date: ev.event_date,
    status: ev.status,
    count: countMap.get(ev.id) ?? 0,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Program</h1>
        <Link href="/admin/events/new" className="btn-primary">
          + Program Baharu
        </Link>
      </div>

      <EventList rows={rows} />
    </div>
  );
}
