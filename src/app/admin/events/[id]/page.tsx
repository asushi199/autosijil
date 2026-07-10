import Link from "next/link";
import { notFound } from "next/navigation";
import { adminClient } from "@/lib/supabase/admin";
import { STATUS_LABEL, type Attendee, type EventRow } from "@/lib/types";
import QrPanel from "./QrPanel";
import StatusControls from "./StatusControls";
import ImportPanel from "./ImportPanel";
import { deleteAttendee, deleteEvent } from "../../actions";

export const dynamic = "force-dynamic";

export default async function EventDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = adminClient();
  const { data: event } = await db.from("events").select("*").eq("id", id).single<EventRow>();
  if (!event) notFound();

  const { data: attendees } = await db
    .from("attendees")
    .select("*")
    .eq("event_id", id)
    .order("created_at", { ascending: true })
    .returns<Attendee[]>();

  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const publicUrl = `${base}/e/${event.slug}`;
  const fields = event.form_fields ?? [];
  const nameLabel = fields.find((f) => f.role === "name")?.label ?? "Nama";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{event.title}</h1>
          <p className="text-sm text-gray-500">
            {event.event_date ?? "Tarikh belum ditetapkan"}
            {event.location ? ` · ${event.location}` : ""} · Status:{" "}
            <b>{STATUS_LABEL[event.status]}</b>
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/admin/events/${id}/edit`} className="btn-secondary">
            Sunting Program
          </Link>
          <form
            action={async () => {
              "use server";
              await deleteEvent(id);
            }}
          >
            <button type="submit" className="btn-danger">Padam</button>
          </form>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <section className="card">
          <h2 className="mb-3 font-medium">Pautan &amp; QR Kehadiran</h2>
          <QrPanel url={publicUrl} title={event.title} />
        </section>

        <section className="card">
          <h2 className="mb-3 font-medium">Status Program</h2>
          <StatusControls eventId={id} current={event.status} hasTemplate={!!event.template_id} />
        </section>
      </div>

      <section className="card">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-medium">
            Kehadiran <span className="text-gray-400">({attendees?.length ?? 0})</span>
          </h2>
          <div className="flex flex-wrap gap-2">
            {event.template_id && (
              <a href={`/api/admin/events/${id}/sample`} target="_blank" className="btn-secondary text-xs">
                Pratonton Sijil
              </a>
            )}
            <a href={`/api/admin/events/${id}/csv`} className="btn-secondary text-xs">
              Eksport CSV
            </a>
            {event.template_id && (attendees?.length ?? 0) > 0 && (
              <>
                <a href={`/api/admin/events/${id}/pdf`} className="btn-primary text-xs">
                  Semua Sijil (1 PDF)
                </a>
                <a href={`/api/admin/events/${id}/zip`} className="btn-secondary text-xs">
                  Semua Sijil (ZIP)
                </a>
              </>
            )}
          </div>
        </div>

        <div className="mb-3">
          <ImportPanel eventId={id} nameLabel={nameLabel} />
        </div>

        {!attendees?.length ? (
          <p className="py-6 text-center text-sm text-gray-500">
            Tiada kehadiran lagi. Kongsikan QR / pautan di atas kepada peserta.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="px-3 py-2 font-medium">#</th>
                  {fields.map((f) => (
                    <th key={f.key} className="px-3 py-2 font-medium">{f.label}</th>
                  ))}
                  <th className="px-3 py-2 font-medium">Masa</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {attendees.map((a, i) => (
                  <tr key={a.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                    {fields.map((f) => (
                      <td key={f.key} className="px-3 py-2">{a.data?.[f.key] ?? ""}</td>
                    ))}
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                      {new Date(a.created_at).toLocaleString("ms-MY")}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <form
                        action={async () => {
                          "use server";
                          await deleteAttendee(id, a.id);
                        }}
                      >
                        <button type="submit" className="text-xs text-red-600 hover:underline cursor-pointer">
                          padam
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
