# Reka Bentuk: Direktori Sekolah Boleh Guna Semula

## Tujuan

Sediakan direktori tetap sekolah daerah Manjung supaya setiap Program boleh
menambah soalan sekolah tanpa menyalin 102 pilihan secara manual. Pilihan pada
borang dipaparkan sebagai `KOD SEKOLAH — NAMA SEKOLAH`.

## Skop

- Import 102 rekod daripada `direktori-schools-2026-07-19.csv`.
- Simpan kod sekolah, nama sekolah, zon dan masa kemas kini sumber dalam
  pangkalan data Supabase.
- Tambah jenis medan borang `Direktori Sekolah` pada penyunting Program.
- Peserta memilih sekolah daripada senarai tunggal yang boleh dicari.
- Nilai pilihan disimpan sebagai kod sekolah; paparan borang, CSV dan sijil
  menggunakan format `KOD — NAMA`.

## Reka Bentuk Data

Jadual `school_directory` ialah sumber tunggal direktori:

| Lajur | Tujuan |
| --- | --- |
| `code` | Kod sekolah unik, contoh `ABA1001` |
| `name` | Nama sekolah, contoh `SK DENDANG` |
| `zone` | Zon sekolah |
| `source_updated_at` | Tarikh kemas kini daripada fail sumber |
| `created_at`, `updated_at` | Audit rekod direktori |

Migrasi kekal idempotent dan RLS kekal tertutup. Semua bacaan/kemas kini dibuat
daripada kod pelayan melalui `adminClient()`.

## Aliran Borang

1. Admin menambah medan **Direktori Sekolah** dalam Program dan boleh
   menandakannya sebagai wajib atau sebagai sumber sekolah untuk sijil.
2. Halaman awam memuat senarai pilihan dan memaparkan `ABA1001 — SK DENDANG`.
3. Peserta memilih satu sekolah. Sistem menyimpan kodnya, lalu menggunakan
   direktori untuk memaparkan label penuh secara konsisten.
4. CSV dan sijil menerima label penuh, bukan kod sahaja.

## Sekolah dan Unit

Sekolah dan Unit ialah dua medan berasingan:

- **Direktori Sekolah**: senarai standard untuk sekolah Manjung.
- **Unit / Bahagian**: medan teks atau senarai pilihan biasa, ditambah hanya
  apabila Program memerlukannya.

Kedua-duanya boleh dipetakan secara manual ke slot templat sijil. Ini mengelak
senarai sekolah dicemari nama Unit sementara dan membolehkan Program yang hanya
melibatkan Unit kekal fleksibel.

## Pengendalian Ralat

- Kod sekolah yang tiada dalam direktori ditolak semasa penghantaran borang.
- Jika direktori gagal dimuatkan, borang memaparkan ralat yang jelas dan tidak
  membenarkan penghantaran medan sekolah yang tidak sah.
- Import dilaksanakan secara upsert berdasarkan `code`, jadi fail terkini boleh
  diimport semula tanpa pendua.

## Pengesahan

- Ujian unit: format label, pengesahan kod dan penukaran kod kepada label.
- Ujian aliran borang: medan sekolah memerlukan satu kod yang sah.
- Semakan import: 102 rekod unik wujud dalam direktori.
- Jalankan `npm run test`, `npm run lint`, dan `npm run build` sebelum push.
