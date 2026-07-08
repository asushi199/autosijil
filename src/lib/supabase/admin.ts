import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Klien service-role — HANYA untuk kod pelayan (route handlers / server actions).
 * Memintas RLS; setiap pemanggil mesti buat semakan kebenaran sendiri.
 */
export function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
