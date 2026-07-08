import { notFound } from "next/navigation";
import { adminClient } from "@/lib/supabase/admin";
import type { Template } from "@/lib/types";
import TemplateEditor from "./TemplateEditor";

export const dynamic = "force-dynamic";

export default async function TemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = adminClient();
  const { data: template } = await db.from("templates").select("*").eq("id", id).single<Template>();
  if (!template) notFound();
  return <TemplateEditor template={template} />;
}
