import { createBrowserClient } from "@supabase/ssr";

/** Klien Supabase untuk komponen pelanggan (log masuk sahaja). */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
