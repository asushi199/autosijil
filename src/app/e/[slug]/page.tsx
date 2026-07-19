import { adminClient } from "@/lib/supabase/admin";
import type { EventRow } from "@/lib/types";
import type { SchoolDirectoryEntry } from "@/lib/school-directory";
import AttendanceForm from "./AttendanceForm";
import SemakSijil from "./SemakSijil";

export const dynamic = "force-dynamic";

function Shell({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col px-4 py-8">
      {title && <h1 className="mb-1 text-xl font-semibold">{title}</h1>}
      {children}
      <p className="mt-auto pt-8 text-center text-xs text-gray-400">
        Sistem e-Sijil &amp; Kehadiran
      </p>
    </main>
  );
}

export default async function PublicEventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const db = adminClient();
  const { data: event } = await db
    .from("events")
    .select("id, slug, title, description, event_date, location, status, form_fields, requires_certificate")
    .eq("slug", slug)
    .single<Omit<EventRow, "template_id" | "created_at">>();

  if (!event || event.status === "draft") {
    return (
      <Shell>
        <div className="card text-center text-gray-600">Program tidak ditemui.</div>
      </Shell>
    );
  }

  const fields = event.form_fields ?? [];
  const schools: SchoolDirectoryEntry[] = fields.some((field) => field.type === "school")
    ? ((await db.from("school_directory").select("code, name, zone").order("code")).data ?? []) as SchoolDirectoryEntry[]
    : [];

  const meta = (
    <p className="mb-4 text-sm text-gray-500">
      {event.event_date && <>Tarikh: {event.event_date}</>}
      {event.location && <> · {event.location}</>}
    </p>
  );

  if (event.status === "open") {
    return (
      <Shell title={event.title}>
        {meta}
        {event.description && <p className="mb-4 text-sm text-gray-600">{event.description}</p>}
        {!event.requires_certificate && <p className="mb-3 text-sm font-medium text-blue-800">Borang Pendaftaran</p>}
        <AttendanceForm slug={event.slug} fields={fields} schools={schools} isRegistration={!event.requires_certificate} />
      </Shell>
    );
  }

  if (event.status === "closed") {
    return (
      <Shell title={event.title}>
        {meta}
        <div className="card text-center text-gray-600">
          Pendaftaran kehadiran telah <b>ditutup</b>.
          {event.requires_certificate && <p className="mt-2 text-sm text-gray-500">
            Sijil akan boleh dimuat turun di pautan ini selepas dibuka oleh urus setia.
          </p>}
        </div>
      </Shell>
    );
  }

  // released
  return (
    <Shell title={event.title}>
      {meta}
      <SemakSijil slug={event.slug} />
    </Shell>
  );
}
