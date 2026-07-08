/** URL awam bagi objek dalam baldi 'templates'. Selamat digunakan di klien. */
export function templateBgUrl(path: string | null): string | null {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/templates/${path}`;
}
