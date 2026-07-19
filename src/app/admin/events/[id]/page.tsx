import Link from "next/link";
import { notFound } from "next/navigation";
import { adminClient } from "@/lib/supabase/admin";
import { STATUS_LABEL, type Attendee, type EventRow } from "@/lib/types";
import type { SchoolDirectoryEntry } from "@/lib/school-directory";
import QrPanel from "./QrPanel";
import StatusControls from "./StatusControls";
import ImportPanel from "./ImportPanel";
import AttendeeTable from "./AttendeeTable";
import ConfirmSubmit from "../../ConfirmSubmit";
import { deleteEvent } from "../../actions";

export const dynamic = "force-dynamic";

export default async function EventDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = adminClient();
  const { data: event } = await db.from("events").select("*").eq("id", id).single<EventRow>();
  if (!event) notFound();
  const fields = event.form_fields ?? [];
  const schools: SchoolDirectoryEntry[] = fields.some((field) => field.type === "school")
    ? ((await db.from("school_directory").select("code, name, zone").order("name")).data ?? []) as SchoolDirectoryEntry[]
    : [];

  const { data: attendees } = await db
    .from("attendees")
    .select("*")
    .eq("event_id", id)
    .order("created_at", { ascending: true })
    .returns<Attendee[]>();

  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const publicUrl = `${base}/e/${event.slug}`;
  const nameField = fields.find((f) => f.role === "name");

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
          <ConfirmSubmit
            action={async () => {
              "use server";
              await deleteEvent(id);
            }}
            message={`Padam program "${event.title}" dan semua rekod kehadirannya? Tindakan ini tidak boleh diundur.`}
            className="btn-danger"
          >
            Padam
          </ConfirmSubmit>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <section className="card">
          <h2 className="mb-3 font-medium">Pautan &amp; QR Kehadiran</h2>
          <QrPanel url={publicUrl} title={event.title} />
        </section>

        <section className="card">
          <h2 className="mb-3 font-medium">Status Program</h2>
          <StatusControls eventId={id} current={event.status} hasTemplate={!!event.template_id} requiresCertificate={event.requires_certificate ?? true} />
        </section>
      </div>

      <section className="card">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-medium">
            Kehadiran <span className="text-gray-400">({attendees?.length ?? 0})</span>
          </h2>
          <div className="flex flex-wrap gap-2">
            {event.requires_certificate && event.template_id && (
              <a href={`/api/admin/events/${id}/sample`} target="_blank" className="btn-secondary text-xs">
                Pratonton Sijil
              </a>
            )}
            <a href={`/api/admin/events/${id}/csv`} className="btn-secondary text-xs">
              Eksport CSV
            </a>
            {event.requires_certificate && event.template_id && (attendees?.length ?? 0) > 0 && (
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
          <ImportPanel eventId={id} fields={fields} />
        </div>

        {!attendees?.length ? (
          <p className="py-6 text-center text-sm text-gray-500">
            Tiada kehadiran lagi. Kongsikan QR / pautan di atas kepada peserta.
          </p>
        ) : (
          <AttendeeTable
            eventId={id}
            attendees={attendees}
            fields={fields}
            schools={schools}
            nameKey={nameField?.key ?? null}
            hasTemplate={!!event.requires_certificate && !!event.template_id}
          />
        )}
      </section>
    </div>
  );
}
