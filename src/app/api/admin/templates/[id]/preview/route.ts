import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { generateSijil } from "@/lib/pdf";
import type { Template } from "@/lib/types";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const db = adminClient();
  const { data: template } = await db
    .from("templates")
    .select("*")
    .eq("id", id)
    .single<Template>();
  if (!template) return NextResponse.json({ error: "Templat tidak ditemui." }, { status: 404 });

  let bgBytes: Uint8Array | null = null;
  if (template.bg_image_path) {
    const { data: blob } = await db.storage.from("templates").download(template.bg_image_path);
    if (blob) bgBytes = new Uint8Array(await blob.arrayBuffer());
  }

  const pdf = await generateSijil(template, bgBytes, {
    name: "Ahmad Danial bin Abdullah",
    ic: "900101-08-1234",
    eventName: "Bengkel Pengurusan Data Sekolah 2026",
    eventDate: "8 Julai 2026",
  });

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Pratonton_Templat.pdf"`,
    },
  });
}
