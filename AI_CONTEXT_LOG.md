# AI Context Log

Log keputusan dan konteks penting untuk sesi AI akan datang. Tambah entri terbaru di atas.

## 2026-07-19 — Carian sijil masa nyata

- **Keperluan pengguna**: peserta boleh mencari sijil sendiri dengan carian nama kabur dan
  mendapat maklum balas segera; pengguna meluluskan paparan nama penuh.
- **Keputusan**: route awam `cadangan` hanya aktif apabila status Program `released`, memerlukan
  sekurang-kurangnya tiga aksara, dan memulangkan maksimum lapan nama sahaja (tanpa ID, token,
  IC atau jawapan borang). Klik cadangan masih melalui `semak` tepat untuk mengeluarkan token;
  pendua nama kekal perlu diurus urus setia.

## 2026-07-19 — Pencari Direktori Sekolah

- **Keperluan pengguna**: pilihan sekolah perlu disusun mengikut kod dan boleh dicari melalui
  kod atau nama supaya 102 rekod mudah dipilih pada telefon.
- **Keputusan**: gantikan `<select>` sekolah dengan pencari klien yang menapis kod/nama tanpa
  peka huruf besar/kecil. Nilai yang dihantar kekal kod sekolah; semua query direktori kini
  disusun mengikut `code` menaik.
- **Lokasi berbilang tempat**: gunakan medan pilihan `Tempat Kursus / Lokasi` pada Program,
  tandakan boleh dicetak pada sijil, dan petakan ke `participant slot` templat. Ini kekal
  berasingan daripada lokasi Program tetap.

## 2026-07-19 — Direktori Sekolah Manjung boleh guna semula

- **Keperluan pengguna**: simpan nama dan kod sekolah Manjung untuk guna semula dalam borang
  Program, dengan paparan `KOD — NAMA`; Unit perlu kekal fleksibel.
- **Keputusan**: jadual `school_directory` ialah sumber tunggal (code, name, zone,
  source_updated_at) dengan RLS. Jenis medan `school` menyimpan kod sahaja; borang, jadual
  admin, CSV dan sijil menukarnya kepada `KOD — NAMA`. Route kehadiran mengesahkan kod di
  pelayan.
- **Sekolah + Unit**: tambah **Direktori Sekolah** dan medan teks / pilihan berasingan
  **Unit / Bahagian**. Jangan masukkan Unit sementara ke dalam direktori sekolah.
- **Import**: `scripts/import-school-directory.mjs` melakukan upsert mengikut `code`.
  Pada 2026-07-19, fail sumber telah diimport dan Supabase mengesahkan **102** rekod.

## 2026-07-17 — Elemen "Nama Sekolah / Unit" pada sijil

- **Keperluan pengguna**: sediakan elemen nama sekolah pada templat sijil untuk kegunaan
  akan datang (belum digunakan sekarang).
- **Keputusan**: cermin corak `ic` hujung-ke-hujung supaya templat kekal boleh guna semula
  merentas program. Tambah `role: "school"` (FormField) + `ElementSource "school"`.
  - `pdf.ts`: `SijilValues.school?` + `resolveText` case "school".
  - `sijil-data.ts` `attendeeValues`: baca nilai sekolah daripada `attendee.data` mengikut
    medan `role:"school"` (bukan lajur DB khas — jadi tiada perubahan skema).
  - `TemplateEditor.tsx`: butang "+ Nama Sekolah / Unit" + label + nilai contoh pratonton.
  - `EventEditor.tsx`: kotak semak tandakan medan sebagai role "school" (unik).
  - Route pratonton templat & sampel sijil: hantar nilai sekolah contoh.
  - `withElementDefaults`: sekolah = bukan nameLike → fit lalai "wrap" (nama sekolah panjang).
- **Tiada perubahan skema DB.** `npm run build` + `lint` lulus.

## 2026-07-17 — Import pukal berbilang lajur (medan mengikut program)

- **Keperluan pengguna**: aktiviti peringkat daerah selalu perlu import data selain nama
  (cth. nama sekolah) dan medan khas yang berbeza ikut program — tidak boleh ditetapkan.
- **Keputusan**: `importAttendees` kekal satu kotak teks, tetapi setiap baris dikesan:
  satu lajur (tiada Tab) = nama sahaja (kekal serasi ke belakang); berbilang lajur dipisah
  **Tab** = dipetakan ke `form_fields` MENGIKUT SUSUNAN medan program itu (salin terus dari
  Excel/Sheets). Nama diambil ikut medan `role:name`; IC (jika ada `role:ic`) dinormalisasi.
  Dedupe kini ikut nama + IC (padan indeks unik DB), bukan nama sahaja.
- **UI** `ImportPanel.tsx`: terima `fields` (bukan lagi `nameLabel`); papar susunan lajur
  secara dinamik (chip medan, medan nama ditonjol biru) + contoh placeholder ber-Tab.
- **Tiada perubahan skema DB.** `npm run build` + `lint` lulus.

## 2026-07-17 — Penambahbaikan UX (semakan dari perspektif pengguna)

- **Keperluan pengguna**: semak semula aliran dari sudut peserta & urus setia, laksana semua
  penambahbaikan yang dikenal pasti sekaligus.
- **Peserta**:
  - Semakan sijil kini tahan ruang berlebihan — `normalizeName()` (baharu, `sijil-data.ts`)
    kecutkan ruang & huruf kecil. `semak/route.ts` tapik dalam JS (bukan lagi `ilike` DB)
    supaya "Ali  bin  Abu" padan "Ali bin Abu".
  - Borang kehadiran (`AttendanceForm.tsx`) papar semula nama yang diisi selepas hantar,
    dengan peringatan betulkan dengan urus setia jika silap.
- **Urus setia (admin)**:
  - Jadual kehadiran diekstrak ke `AttendeeTable.tsx` (klien): kotak carian, sunting nama
    inline (`updateAttendeeName()` baharu dalam `actions.ts` — kemas `name_value` + `data`,
    kendali 23505 nama pendua), pautan muat turun sijil per-baris, dan padam dengan `confirm()`.
  - Route baharu `api/admin/events/[id]/sijil?attendee=<id>` — jana sijil seorang peserta
    tanpa mengira status program (lindung proxy admin). Selesaikan kes peserta nama sama yang
    tidak boleh semak sendiri.
  - Padam Program kini melalui `ConfirmSubmit.tsx` (baharu) — minta pengesahan dulu.
- **Tiada perubahan skema DB.**
- **Pengesahan**: `npm run build` + `lint` lulus. Ujian visual langsung tidak dijalankan
  (perlukan Supabase + `.env.local` yang tiada dalam persekitaran ini).

## 2026-07-10 — Import pukal senarai + tukar "Majlis" → "Program" + bar tab mudah alih

- **Keperluan pengguna**: (1) kadangkala sijil perlu diberi tanpa peserta mengisi borang
  pautan, jadi perlu import senarai nama sendiri (cara mudah); (2) tukar semua label UI
  "Majlis" kepada "Program"; (3) reka bentuk mudah alih — nav atas admin jadi bar tab bawah.
- **Import pukal**: `importAttendees(eventId, rawText)` dalam `actions.ts` — satu nama satu
  baris, dipetakan ke medan `role: "name"`, `ic_value: null`. Buang pendua dalam input &
  langkau nama yang sudah wujud (tak sensitif huruf besar/kecil); had 2000 baris.
  UI: `src/app/admin/events/[id]/ImportPanel.tsx` (butang toggle + textarea) dalam seksyen
  Kehadiran. **Tiada perubahan skema** — guna semula jadual `attendees` sedia ada.
- **Rename**: hanya teks UI/komen "Majlis"/"majlis" → "Program"/"program". Jadual DB `events`
  & pengecam kod kekal tidak berubah.
- **Bar tab mudah alih**: `src/app/admin/AdminNav.tsx` — desktop kekal nav atas, mudah alih
  dapat bar tab bawah tetap (Program/Templat/Log Keluar) dengan padding safe-area.
- **Pengesahan**: build + lint lulus; halaman awam dirender bersih tanpa ralat konsol.

## 2026-07-08 — Auth kata laluan dikongsi & semak sijil ikut nama sahaja

- **Keperluan pengguna**: (1) buang login Supabase yang leceh (hanya pasukan kecil guna);
  (2) semak sijil guna nama sahaja — buang "atau IC" kerana IC tidak selalu dikumpul.
- **Keputusan auth**: TIDAK buang login sepenuhnya (risiko dedah data peribadi peserta di URL
  awam Vercel). Ganti Supabase Auth dengan **satu kata laluan dikongsi** (env `ADMIN_PASSWORD`)
  — pengguna pilih opsyen ini.
  - `src/lib/admin-auth.ts` (baharu, SELAMAT Edge — hanya Web Crypto `crypto.subtle`, tiada
    import Node, tiada "server-only" supaya boleh diimport middleware). Kuki `admin_auth` =
    HMAC(ADMIN_PASSWORD, secret); tukar kata laluan → kuki lama batal automatik.
  - `src/proxy.ts` guna `isAuthedCookie` (bukan lagi sesi Supabase).
  - `src/app/admin/actions.ts`: `requireUser()` kini semak kuki; tambah `loginAdmin(prev, fd)`
    (useActionState) & `signOut()` (padam kuki); `createEvent` guna `created_by: null`.
  - `src/app/login/page.tsx`: satu medan kata laluan sahaja.
  - Fail lama dipadam: `src/lib/supabase/{client,server}.ts` (auth Supabase, kini yatim).
    Tinggal `admin.ts` (service role) untuk semua akses DB.
- **Semak sijil**: `SemakSijil.tsx` + `api/e/[slug]/semak/route.ts` kini padan nama sahaja
  (`ilike`), buang cabang IC. Mesej berbilang-padanan → "hubungi urus setia".
- **PENTING deploy**: tambah `ADMIN_PASSWORD` dalam env Vercel (selain kunci Supabase).
- **Pengesahan**: build + lint lulus; logik token HMAC diuji (stabil, padanan kuki betul,
  putaran kata laluan batalkan kuki lama).

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
