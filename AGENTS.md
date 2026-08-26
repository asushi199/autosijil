<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Sistem e-Sijil & Kehadiran — panduan agen

Baca `README.md` untuk gambaran sistem, `CODEGRAPH.md` untuk peta fail/aliran
(baca dahulu sebelum mengimbas seluruh repo), dan `AI_CONTEXT_LOG.md` untuk
keputusan reka bentuk.

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
- Apabila menambah laluan, jadual, atau aliran utama, kemas kini `CODEGRAPH.md`
  dalam perubahan yang sama.
- `src/proxy.ts` ialah pengganti middleware (konvensyen Next 16) — melindungi `/admin` dan
  `/api/admin`.

## Perintah

- `npm run dev` — pelayan pembangunan (perlukan `.env.local` dengan kunci Supabase)
- `npm run build` — semakan jenis + binaan penuh
- `npm run lint` — ESLint
- `npm test` — ujian unit (Vitest)

## Cursor Cloud specific instructions

- Persekitaran Cloud Agent ditakrifkan dalam `.cursor/environment.json`:
  - `install` → `.cursor/install.sh` (pakej sistem, Supabase CLI, `npm ci`, pra-tarik imej Docker).
  - `start` → `.cursor/start.sh` (mulakan Docker + Supabase, guna `supabase/migration.sql`, tulis `.env.local`).
  - terminal `next-dev` menjalankan `npm run dev` pada port 3000.
- Supabase dijalankan **secara tempatan** melalui Supabase CLI (Docker) — bukan projek hos.
  API: `http://127.0.0.1:54321`, Studio: `http://127.0.0.1:54323`, DB: port 54322.
  Workspace CLI berada di `~/supabase-local` (bukan dalam repo).
- Nota nested-Docker: `.cursor/docker-up.sh` guna pemacu storan `fuse-overlayfs` dan menetapkan
  `net.bridge.bridge-nf-call-iptables=0` supaya kontena Supabase boleh berkomunikasi.
- Log masuk admin dev: `ADMIN_PASSWORD=admin123`. `.env.local` guna kunci demo tempatan Supabase
  (selamat untuk dev sahaja) dan tidak di-commit.
- Untuk uji hujung-ke-hujung: cipta Program (`/admin`), buka kehadiran, rekod peserta di
  `/e/<slug>`, tukar status ke *Sijil Dibuka*, kemudian muat turun sijil PDF di pautan yang sama.
