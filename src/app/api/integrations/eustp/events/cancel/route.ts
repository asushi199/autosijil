import { NextResponse } from "next/server";
import { assertEustpIntegrationAuth } from "@/lib/integration-auth";
import { adminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type CancelBody = {
  externalBookingId?: string;
};

export async function POST(req: Request) {
  if (!assertEustpIntegrationAuth(req)) {
    return NextResponse.json({ error: "Tidak dibenarkan" }, { status: 401 });
  }

  let body: CancelBody;
  try {
    body = (await req.json()) as CancelBody;
  } catch {
    return NextResponse.json({ error: "JSON tidak sah" }, { status: 400 });
  }

  const externalBookingId = String(body.externalBookingId ?? "").trim();
  if (!externalBookingId) {
    return NextResponse.json({ error: "externalBookingId diperlukan" }, { status: 400 });
  }

  const db = adminClient();
  const { data: existing, error: findError } = await db
    .from("events")
    .select("id")
    .eq("external_source", "eustp")
    .eq("external_booking_id", externalBookingId)
    .maybeSingle();

  if (findError) {
    return NextResponse.json({ error: findError.message }, { status: 500 });
  }

  if (!existing) {
    return NextResponse.json({ ok: true, closed: false });
  }

  const { error: updateError } = await db
    .from("events")
    .update({ status: "closed" })
    .eq("id", existing.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, closed: true });
}
