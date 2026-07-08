<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Sistem e-Sijil & Kehadiran — panduan agen

Baca `README.md` untuk gambaran sistem dan `AI_CONTEXT_LOG.md` untuk keputusan reka bentuk.

## Peraturan projek

- Bahasa UI (awam & admin): **Bahasa Melayu**. Kod, komen, dan nama pemboleh ubah: Inggeris
  atau Melayu, ikut fail sedia ada.
- Semua akses pangkalan data melalui `adminClient()` (service role) dalam kod pelayan
  sahaja; setiap route/action mesti buat semakan auth sendiri (`requireUser()` untuk admin).
  Jangan sekali-kali dedahkan `SUPABASE_SERVICE_ROLE_KEY` ke klien.
- PDF sijil dijana on-demand melalui `src/lib/pdf.ts` (`generateSijil` /
  `generateCombinedSijil`) — jangan simpan PDF ke storan.
- Kedudukan elemen templat ialah pecahan 0–1 daripada saiz halaman A4; kekalkan semantik ini
  supaya editor (CSS %) dan PDF (points) kekal sepadan.
- Skema DB: `supabase/migration.sql`. Sebarang perubahan skema mesti dikemas kini dalam fail
  itu (idempotent — `if not exists`).
- `src/proxy.ts` ialah pengganti middleware (konvensyen Next 16) — melindungi `/admin` dan
  `/api/admin`.

## Perintah

- `npm run dev` — pelayan pembangunan (perlukan `.env.local` dengan kunci Supabase)
- `npm run build` — semakan jenis + binaan penuh
- `npm run lint` — ESLint
