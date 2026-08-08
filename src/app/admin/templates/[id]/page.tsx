import { notFound } from "next/navigation";
import { adminClient } from "@/lib/supabase/admin";
import { formatTarikh } from "@/lib/pdf";
import type { EventRow, Template, TemplatePreviewSamples } from "@/lib/types";
import TemplateEditor from "./TemplateEditor";

export const dynamic = "force-dynamic";

export default async function TemplatePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ event?: string }>;
}) {
  const { id } = await params;
  const { event: eventId } = await searchParams;
  const db = adminClient();
  const { data: template } = await db.from("templates").select("*").eq("id", id).single<Template>();
  if (!template) notFound();

  let previewEvent: (Pick<EventRow, "id" | "title"> & { samples: TemplatePreviewSamples }) | null =
    null;

  if (eventId) {
    if (template.owner_event_id && template.owner_event_id !== eventId) notFound();
    const { data: event } = await db.from("events").select("*").eq("id", eventId).single<EventRow>();
    if (!event) notFound();
    previewEvent = {
      id: event.id,
      title: event.title,
      samples: {
        event_name: event.title,
        event_date: formatTarikh(event.event_date),
        event_location: event.location ?? "",
      },
    };
  }

  return <TemplateEditor template={template} previewEvent={previewEvent} />;
}
