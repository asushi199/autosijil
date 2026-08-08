# Reka Bentuk: Baris Manual pada Nama Program & Teks Statik

## Tujuan

Membenarkan pentadbir mengawal pemenggalan baris pada sijil:

1. **Nama Program** — setiap program menyimpan teks paparan sijil sendiri (boleh
   ada baris baharu / baris kosong), supaya banyak program boleh kongsi satu
   templat tetapi setiap sijil memaparkan nama programnya sendiri dengan susunan
   baris yang dikehendaki.
2. **Teks Statik** — kotak input dalam penyunting templat menyokong baris
   berbilang supaya ayat panjang ad hoc boleh disusun tanpa bergantung pada
   balutan automatik sahaja.

## Keputusan Utama

| Soalan | Keputusan |
|---|---|
| Templat vs program | Templat kekal dikongsi (latar, kedudukan, fon). Teks nama program yang dibreak ialah **per program**. |
| Di mana edit nama program | Halaman **edit program** (bukan urus templat). |
| Di mana edit teks statik | **Urus templat** — elemen Teks Statik. |
| Banyak program, satu templat | Ya — setiap program + setiap peserta masih dapat sijil sendiri; hanya `certificate_title` / data peserta berbeza. |
| Motor baris | Kekalkan `wrapLines` sedia ada (sudah hormati `\n`). |

## Aliran Dipilih

### A. Nama pada sijil (per program)

1. Tambah lajur nullable `events.certificate_title` (`text`, idempotent dalam
   `supabase/migration.sql`).
2. Pada halaman edit program (bila `requires_certificate`), paparkan textarea
   **「Nama pada sijil」** berhampiran pilihan templat.
3. Nilai awal UI: `certificate_title ?? title`.
4. Butang kecil **「Salin semula dari Nama program」** menyalin `title` semasa
   ke textarea (untuk program baharu / tukar nama).
5. Semasa simpan: simpan kandungan textarea ke `certificate_title` (benarkan
   `\n` dan baris kosong).
6. Semasa jana PDF / pratonton:  
   `eventName = certificate_title` jika tidak kosong selepas trim keseluruhan
   string; jika kosong/null, guna `title`.  
   (Trim hanya untuk ujian “ada kandungan”; kandungan yang dihantar ke
   `wrapLines` kekal dengan baris dalaman.)
7. Sinkron pintar dalam sesi edit: jika pengguna menukar `title` dan nilai
   textarea masih sama dengan `title` lama, kemas kini textarea kepada `title`
   baharu. Jika pengguna sudah ubah susunan baris, jangan tulis ganti secara
   automatik.

### B. Teks Statik (dalam templat)

1. Tukar `<input>` Teks kepada `<textarea>` (beberapa baris) dalam
   `TemplateEditor`.
2. Simpan `\n` dalam `elements[].text` seperti biasa (JSON templat sedia ada).
3. Pratonton kanvas & PDF sudah menggunakan `wrapLines` yang memisah per
   `\n` — tiada perubahan algoritma diperlukan.
4. Jika `fit === "shrink"` dan teks ada `\n`, kekalkan tingkah laku semasa
   (ukuran sebagai satu rentetan); UI boleh nyatakan bahawa baris manual lebih
   sesuai dengan mod **Balut**. Tiada migrasi data.

## Di Luar Skop

- Menyalin keseluruhan templat per program.
- Editor baris visual (drag baris) — textarea + Enter mencukupi.
- Memecahkan medan dinamik lain (`event_date`, `event_location`, slot) secara
  manual dalam v1 (boleh guna Teks Statik jika perlu).
- Menyimpan PDF.

## Fail yang Diubah (jangkaan)

- `supabase/migration.sql` — `alter table … add column if not exists certificate_title`
- `src/lib/types.ts` — medan pada `EventRow`
- `src/app/admin/actions.ts` — `UpdateEventPayload`
- `src/app/admin/events/[id]/edit/EventEditor.tsx` — UI textarea + salin semula + sinkron pintar
- `src/lib/sijil-data.ts` — `attendeeValues` baca `certificate_title`
- `src/app/admin/templates/[id]/TemplateEditor.tsx` — textarea untuk Teks Statik
- Ujian berkaitan `attendeeValues` / wrap jika sedia ada; tambah liputan minimum
- `AI_CONTEXT_LOG.md` — rekod keputusan ringkas

## Pengesahan

- Edit program: tetapkan nama dengan baris manual → pratonton/jana sijil ikut baris itu.
- Program B kongsi templat sama, nama berbeza → sijil B tidak memakai baris program A.
- `certificate_title` kosong → jatuh balik ke `title` (tingkah laku lama).
- Teks Statik: Enter / baris kosong kelihatan di kanvas dan PDF.
- `npm run lint` / ujian berkaitan / `npm run build` lulus.
