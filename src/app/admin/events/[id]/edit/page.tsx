import { notFound } from "next/navigation";
import { adminClient } from "@/lib/supabase/admin";
import type { EventRow, Template } from "@/lib/types";
import EventEditor from "./EventEditor";

export const dynamic = "force-dynamic";

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = adminClient();
  const [{ data: event }, { data: templates }] = await Promise.all([
    db.from("events").select("*").eq("id", id).single<EventRow>(),
    db.from("templates").select("id, name, orientation").order("created_at", { ascending: false }),
  ]);
  if (!event) notFound();

  return (
    <EventEditor
      event={event}
      templates={(templates ?? []) as Pick<Template, "id" | "name" | "orientation">[]}
    />
  );
}
