import Link from "next/link";
import { adminClient } from "@/lib/supabase/admin";
import { STATUS_LABEL, type EventRow, type EventStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const BADGE: Record<EventStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  open: "bg-green-100 text-green-800",
  closed: "bg-amber-100 text-amber-800",
  released: "bg-blue-100 text-blue-800",
};

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Majlis</h1>
        <Link href="/admin/events/new" className="btn-primary">
          + Majlis Baharu
        </Link>
      </div>

      {!events?.length ? (
        <div className="card text-center text-gray-500 py-12">
          Tiada majlis lagi. Klik <b>Majlis Baharu</b> untuk bermula.
        </div>
      ) : (
        <div className="card p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="px-4 py-3 font-medium">Majlis</th>
                <th className="px-4 py-3 font-medium">Tarikh</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Kehadiran</th>
              </tr>
            </thead>
            <tbody>
              {(events as Pick<EventRow, "id" | "slug" | "title" | "event_date" | "status" | "created_at">[]).map(
                (ev) => (
                  <tr key={ev.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/events/${ev.id}`} className="font-medium text-blue-700 hover:underline">
                        {ev.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{ev.event_date ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${BADGE[ev.status]}`}>
                        {STATUS_LABEL[ev.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{countMap.get(ev.id) ?? 0}</td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
