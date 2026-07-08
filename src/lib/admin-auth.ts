// Pengesahan pentadbir ringkas: satu kata laluan dikongsi (tiada akaun).
// Modul ini SELAMAT untuk Edge (middleware) — hanya guna Web Crypto & env,
// tiada import Node. Jangan tambah "server-only" di sini.

export const ADMIN_COOKIE = "admin_auth";

function secret(): string {
  return (
    process.env.SIJIL_TOKEN_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "dev-secret-change-me"
  );
}

/** Nilai kuki sesi = HMAC(kata laluan) — tidak boleh diteka, dan tukar kata
 *  laluan akan membatalkan semua kuki lama secara automatik. */
export async function adminToken(): Promise<string> {
  const password = process.env.ADMIN_PASSWORD || "";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`admin:${password}`));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Perbandingan masa-tetap untuk elak kebocoran melalui masa tindak balas. */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Sahkan kata laluan yang ditaip terhadap ADMIN_PASSWORD. */
export function passwordMatches(input: string): boolean {
  const password = process.env.ADMIN_PASSWORD || "";
  if (!password) return false; // gagal-tutup jika env belum ditetapkan
  return constantTimeEqual(input, password);
}

/** Sahkan kuki sesi yang dihantar pelayar. */
export async function isAuthedCookie(value: string | undefined): Promise<boolean> {
  if (!value) return false;
  return constantTimeEqual(value, await adminToken());
}
