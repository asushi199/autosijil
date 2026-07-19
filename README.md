# Sistem e-Sijil & Kehadiran

Sistem web untuk merekod kehadiran program melalui QR code dan menjana sijil penyertaan
(PDF A4) secara automatik daripada templat yang boleh ditukar ganti.

**Aliran kerja:**

1. Pentadbir mencipta program → sistem menjana pautan awam + QR code.
2. Peserta imbas QR dan mengisi borang kehadiran (medan borang boleh disesuaikan sepenuhnya).
3. Selepas program, pentadbir menekan **Buka Muat Turun Sijil**.
4. Peserta kembali ke pautan yang sama, masukkan **nama penuh** (seperti diisi semasa
   kehadiran), dan muat turun sijil PDF masing-masing — dijana serta-merta, tiada fail
   disimpan di pelayan.
5. Pentadbir boleh memuat turun semua sijil (1 PDF tergabung atau ZIP) dan eksport CSV kehadiran.

Teknologi: Next.js (App Router) + Supabase (Postgres, Storage, Auth) + pdf-lib. Semua dalam
had percuma Vercel dan Supabase.

## Persediaan (sekali sahaja)

### 1. Cipta projek Supabase (percuma)

1. Daftar di <https://supabase.com> → **New project** (pilih region Singapore).
2. Selepas projek siap, buka **SQL Editor** → **New query** → tampal seluruh kandungan
   [`supabase/migration.sql`](supabase/migration.sql) → **Run**.
3. Buka **Project Settings → API** dan salin tiga nilai:
   - Project URL
   - `anon` public key
   - `service_role` key (**rahsia**)

### 2. Konfigurasi aplikasi

```bash
cp .env.local.example .env.local
# isikan nilai Supabase ke dalam .env.local
# serta tetapkan ADMIN_PASSWORD kepada kata laluan dikongsi pasukan
npm install
npm run dev
```

Buka <http://localhost:3000> → log masuk menggunakan `ADMIN_PASSWORD` yang anda tetapkan.
Satu kata laluan sahaja dikongsi oleh pasukan — tiada akaun individu untuk diurus.

### 3. Deploy ke Vercel (percuma)

1. Push repo ini ke GitHub.
2. Di <https://vercel.com> → **Add New Project** → import repo → deploy.
3. Dalam **Settings → Environment Variables**, masukkan semua pemboleh ubah dalam
   `.env.local.example`, dengan `NEXT_PUBLIC_APP_URL` ditetapkan kepada URL Vercel anda
   (cth. `https://esijil-ppd.vercel.app`).
4. Redeploy. QR code kini menghala ke URL sebenar.

## Penggunaan

- **Templat Sijil**: reka latar sijil A4 dalam Canva/PowerPoint → eksport sebagai PNG/JPG →
  muat naik dalam **Templat Sijil** → seret elemen teks (Nama Peserta, Nama Program, Tarikh,
  Teks Statik) ke kedudukan yang dikehendaki → **Simpan** → **Pratonton PDF**.
- **Program**: cipta program → sesuaikan medan borang (tandakan satu medan sebagai *Nama*;
  medan *No. KP* adalah pilihan tetapi memudahkan semakan sijil) → pilih templat →
  tekan **Buka Kehadiran** → edarkan QR.
- **Status program**: Draf → Buka Kehadiran → Tutup Kehadiran → Buka Muat Turun Sijil.

### Direktori Sekolah

Pada penyunting Program, tambah medan **Direktori Sekolah** untuk memaparkan pilihan seperti
`ABA1001 — SK DENDANG`. Sistem menyimpan kod sekolah tetapi memaparkan kod dan nama pada
jadual admin, CSV dan sijil. Tambah **Unit / Bahagian** sebagai medan teks atau pilihan
berasingan jika Program memerlukannya.

Untuk import atau kemas kini fail CSV sekolah selepas menjalankan migrasi terkini:

```bash
node --env-file=.env.local scripts/import-school-directory.mjs "C:\laluan\direktori-sekolah.csv"
```

Import menggunakan kod sekolah sebagai kunci, jadi fail baharu boleh diimport semula tanpa
rekod pendua.

## Nota teknikal

- Sijil dijana atas permintaan (on-demand) dengan `pdf-lib`; tiada PDF disimpan.
- Fon sijil (Poppins, Playfair Display, Great Vibes — lesen OFL) dibenamkan sebagai base64
  dalam `src/lib/fonts/`.
- Kedudukan elemen templat disimpan sebagai pecahan (0–1) daripada saiz halaman supaya
  padanan editor ↔ PDF adalah tepat.
- Jadual pangkalan data dilindungi RLS; semua akses melalui route handler pelayan yang
  membuat semakan kebenaran sendiri (kunci `service_role` tidak pernah sampai ke pelayar).
