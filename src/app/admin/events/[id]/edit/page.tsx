import { notFound } from "next/navigation";
import { adminClient } from "@/lib/supabase/admin";
import type { EventRow, Template } from "@/lib/types";
import EventEditor from "./EventEditor";

export const dynamic = "force-dynamic";

type TemplateOption = Pick<
  Template,
  "id" | "name" | "orientation" | "elements" | "owner_event_id" | "source_template_id"
>;

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = adminClient();
  const { data: event } = await db.from("events").select("*").eq("id", id).single<EventRow>();
  if (!event) notFound();

  const [{ data: library }, { data: owned }] = await Promise.all([
    db
      .from("templates")
      .select("id, name, orientation, elements, owner_event_id, source_template_id")
      .is("owner_event_id", null)
      .order("created_at", { ascending: false }),
    db
      .from("templates")
      .select("id, name, orientation, elements, owner_event_id, source_template_id")
      .eq("owner_event_id", id)
      .maybeSingle(),
  ]);

  const templates: TemplateOption[] = [...((library ?? []) as TemplateOption[])];
  if (owned) {
    templates.unshift(owned as TemplateOption);
  }

  return <EventEditor event={event} templates={templates} />;
}
