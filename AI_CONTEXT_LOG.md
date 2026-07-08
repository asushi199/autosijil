# AI Context Log

Log keputusan dan konteks penting untuk sesi AI akan datang. Tambah entri terbaru di atas.

## 2026-07-08 — Nama huruf besar & penggalan mengikut penyambung

- **Keperluan pengguna**: (1) nama pada sijil sentiasa huruf besar tanpa mengira input;
  (2) nama panjang dibalut secara munasabah — penggal selepas penyambung BIN/BINTI (Melayu)
  dan A/L/A/P (juga S/O/D/O, India).
- **Pelaksanaan**:
  - `src/lib/text-layout.ts` (baharu, selamat untuk pelanggan & pelayan) — sumber tunggal
    algoritma: `wrapLines(text, measure, maxWidth, connectors?)`, `shrinkSize(...)`,
    `nameForPrint()` (huruf besar), dan set `NAME_CONNECTORS`. Balutan mengutamakan penggal
    selepas penyambung hanya apabila balutan memang diperlukan (nama pendek kekal satu baris).
  - `src/lib/pdf.ts` guna modul ini; `resolveText` untuk `source==='name'` memulangkan
    `nameForPrint()`; balutan nama menghantar `NAME_CONNECTORS`. Fungsi `wrapText`/`shrinkSize`
    tempatan dibuang.
  - `TemplateEditor.tsx` guna algoritma yang sama (dengan canvas measureText) untuk pratonton
    WYSIWYG — nama dipaparkan huruf besar & baris pra-dikira, jadi penggalan pada kanvas sama
    seperti PDF.
- Huruf besar hanya untuk CETAKAN sijil; `name_value` tersimpan, CSV dan semakan (ilike, tidak
  case-sensitive) kekal seperti asal.
- **Pengesahan**: build + lint lulus; diuji dengan nama Melayu & India sebenar (penggal betul
  selepas BIN/BINTI/A/L/A/P, huruf besar, nama pendek tidak dipaksa penggal).

## 2026-07-08 — Balutan teks & penambahbaikan penyunting templat

- **Masalah dilaporkan pengguna**: teks panjang (cth. nama majlis) melimpah keluar sijil —
  tiada balutan automatik, dan penyunting templat kurang intuitif.
- **Penyelesaian**: setiap `TemplateElement` kini ada `boxWidth` (pecahan lebar halaman),
  `fit` (`wrap` = balut ke baris baharu / `shrink` = kecilkan fon agar muat satu baris), dan
  `lineHeight`. Nilai lalai diisi oleh `withElementDefaults()` dalam `src/lib/types.ts` supaya
  templat sedia ada kekal berfungsi (nama/IC → shrink; lain-lain → wrap).
- `src/lib/pdf.ts`: `drawElements` ditulis semula — `wrapText()` (balutan peringkat
  perkataan) + `shrinkSize()`; blok berbilang baris dipusatkan pada `el.y`.
- `TemplateEditor.tsx`: kotak teks kini kelihatan & boleh diseret lebarnya (pemegang bulat),
  pratonton WYSIWYG balut/shrink (guna canvas measureText utk anggaran shrink), garis panduan
  tengah + snap, anjakan kekunci anak panah, panel "cara guna" 4 langkah, kawalan lebar kotak
  + mod fit + jarak baris.
- **Pengesahan**: `npm run build` & `lint` lulus; logik balut diuji dengan rentetan sebenar
  yang melimpah (674pt kotak → 2 baris). Penyunting langsung tidak dapat diuji visual kerana
  Supabase belum disediakan + tiada poppler/Chrome dalam persekitaran ini.

## 2026-07-08 — Binaan awal sistem

- **Tujuan**: Gantikan aliran Google Form + GAS untuk penjanaan sijil. Keperluan disahkan
  bersama pengguna: hosting percuma (Vercel + Supabase), templat = imej latar A4 + editor
  seret-lepas, sijil diberi **selepas** majlis sahaja (status `released`), semakan dengan
  nama **atau** IC, medan borang boleh disesuaikan sepenuhnya, muat turun pukal untuk admin.
- **Keputusan reka bentuk**:
  - PDF dijana on-demand, tiada simpanan — jimat storan untuk 100+ peserta.
  - Kedudukan elemen templat = pecahan (0–1) halaman; sumber elemen terhad kepada
    `name | ic | event_name | event_date | static` supaya templat boleh diguna semula
    merentas majlis dengan medan berbeza.
  - Medan borang guna `role: 'name' | 'ic'` — tepat satu medan `name` diwajibkan
    (dikuatkuasa dalam `updateEvent`).
  - Fon dibenam sebagai base64 TS (`src/lib/fonts/`) untuk elak masalah fail statik
    dalam persekitaran serverless Vercel.
  - Token muat turun sijil = HMAC(attendeeId) — pautan tidak boleh diteka.
  - RLS dihidupkan tanpa polisi; semua akses via service-role dalam route handlers
    dengan semakan auth sendiri (middleware/proxy melindungi `/admin` & `/api/admin`).
  - Next.js 16: fail `middleware.ts` telah dinamakan `src/proxy.ts` (konvensyen baharu).
  - Tailwind v4: kelas komponen (`.btn-primary`, `.card` dll.) ditulis sebagai CSS biasa
    dalam `globals.css` kerana `@apply` kelas tersuai tidak disokong.
- **Belum dibuat / langkah seterusnya**: pengguna perlu cipta projek Supabase + jalankan
  `supabase/migration.sql` + isi `.env.local`; kemudian uji hujung-ke-hujung; kemudian
  deploy ke Vercel. E-mel sijil tidak dibuat (sengaja, v1).
