# Reka Bentuk: Borang Fleksibel dan Templat Sijil Boleh Guna Semula

**Tarikh:** 19 Julai 2026  
**Status:** Diluluskan untuk semakan dokumen

## Matlamat

Membolehkan satu templat sijil digunakan oleh banyak Program walaupun setiap Program
menggunakan medan borang yang berbeza. Pentadbir mesti memetakan medan secara manual
supaya nilai pada sijil sentiasa tepat. Sistem juga perlu menyokong Program yang hanya
mengumpul pendaftaran atau kehadiran tanpa menjana sijil.

## Jenis Program

Setiap Program mempunyai pilihan **Perlu sijil**.

- **Dengan sijil** ialah nilai lalai. Program memerlukan templat, pemetaan maklumat
  sijil, dan aliran status sedia ada sehingga sijil dibuka.
- **Tanpa sijil** menggunakan borang pendaftaran sahaja. Ia masih mempunyai pautan awam,
  QR, senarai peserta, import pukal, suntingan rekod, dan eksport CSV untuk tujuan arkib.
  Ia tidak memaparkan atau menjana sijil tunggal, PDF tergabung, atau ZIP.
- Untuk Program tanpa sijil, status yang digunakan ialah Draf, Dibuka, dan Ditutup.
  Tindakan membuka muat turun sijil tidak dipaparkan.
- Halaman awam Program tanpa sijil menggunakan label **Borang Pendaftaran** dan mesej
  kejayaan pendaftaran, bukan teks kehadiran atau sijil.

## Borang Program

Penyunting Program menyediakan jenis soalan berikut:

| Jenis | Nilai yang disimpan | Boleh dipetakan ke sijil |
| --- | --- | --- |
| Teks pendek | Rentetan | Ya, jika ditanda benarkan pada sijil |
| Perenggan | Rentetan | Ya, jika ditanda benarkan pada sijil |
| Senarai pilihan | Satu pilihan | Ya, jika ditanda benarkan pada sijil |
| Pilihan tunggal | Satu pilihan | Ya, jika ditanda benarkan pada sijil |
| Pilihan berbilang | Senarai pilihan | Tidak |
| Tarikh | Tarikh | Ya, jika ditanda benarkan pada sijil |
| No. Kad Pengenalan | 12 digit | Ya, sebagai sumber sijil khas |

- Soalan senarai pilihan dan pilihan tunggal menyimpan pilihan yang ditetapkan oleh
  pentadbir untuk memastikan ejaan seragam.
- Pilihan berbilang hanya untuk rekod dan eksport CSV. Ia tidak disenaraikan sebagai
  sumber dalam pemetaan sijil.
- Pentadbir menentukan soalan mana yang dibenarkan untuk dicetak pada sijil. Soalan
  pentadbiran seperti telefon, e-mel atau persetujuan tidak muncul dalam pemetaan secara
  lalai.
- Medan nama kekal unik bagi setiap Program dan digunakan untuk sijil serta semakan.
- Medan No. Kad Pengenalan khas menerima tepat 12 digit nombor tanpa sengkang. Pengesahan
  dibuat pada klien dan pelayan. Nilai lama yang mempunyai sengkang dinormalkan untuk
  keserasian membaca.

## Templat dan Pemetaan Manual

Templat sijil menyimpan susun atur serta sumber tetap berikut:

- Nama peserta
- No. Kad Pengenalan
- Nama Program
- Tarikh Program
- Tempat Program tetap
- Teks statik

Selain itu, templat boleh mempunyai **slot maklumat peserta** generik, contohnya
"Jabatan / Sekolah", "Jawatan", atau "Kumpulan". Slot mempunyai ID stabil dan label
paparan, tetapi tidak menyimpan kunci medan mana-mana Program.

Selepas pentadbir memilih templat bagi Program, panel **Pemetaan Maklumat Sijil** memaparkan
setiap slot dan senarai soalan Program yang dibenarkan pada sijil. Pentadbir memilih
padanan secara manual. Pemetaan disimpan pada Program, bukan pada templat, supaya templat
yang sama dapat digunakan semula oleh Program lain tanpa ditimpa.

Contoh:

| Slot templat | Program A | Program B |
| --- | --- | --- |
| Jabatan / Sekolah | Nama sekolah | Agensi / unit bertugas |
| Jawatan | Jawatan | Kategori peranan |
| Kumpulan | Kumpulan bengkel | Sesi penyertaan |

Jika soalan yang dipetakan diubah atau dipadam, pemetaan menjadi tidak lengkap. Sistem
mesti menghalang Program dengan sijil daripada beralih kepada status **Sijil Dibuka**
sehingga semua slot wajib dipetakan semula. Ralat mesti menyatakan slot yang terjejas
dalam Bahasa Melayu.

## Penyimpanan Data

Sistem kekal menggunakan Supabase.

- `events` menyimpan butiran Program, mod perlu sijil, definisi soalan, dan pemetaan slot
  kepada kunci medan Program.
- `attendees` menyimpan jawapan peserta dalam `data` JSON. Nilai satu pilihan disimpan
  sebagai rentetan; pilihan berbilang disimpan sebagai senarai JSON. `name_value` dan
  `ic_value` kekal sebagai lajur khusus untuk semakan dan indeks.
- `templates` menyimpan elemen susun atur serta definisi slot generik; ia tidak menyimpan
  pemetaan Program.
- Baldi Supabase Storage `templates` menyimpan imej latar. PDF sentiasa dijana atas
  permintaan dan tidak disimpan.

Perubahan skema akan ditambah secara idempotent ke `supabase/migration.sql`. Semua akses
data terus menggunakan `adminClient()` dalam kod pelayan; tiada service-role key dihantar
ke pelayar.

## Keserasian, Ralat dan Eksport

- Templat serta Program sedia ada mesti kekal berfungsi. Sumber lama nama, IC dan
  sekolah/unit dibaca seperti biasa.
- UI tidak memadam data peserta apabila templat atau pemetaan berubah.
- CSV mengandungi semua jawapan. Nilai pilihan berbilang ditulis sebagai teks yang
  dipisahkan dengan jelas untuk bacaan manusia.
- Hanya Program dengan sijil memaparkan tindakan PDF, ZIP, pratonton sampel dan muat turun
  sijil peserta.

## Pengesahan

Pelaksanaan akan merangkumi semakan untuk:

1. Setiap jenis soalan, pilihan yang sah dan medan wajib.
2. No. Kad Pengenalan tepat 12 digit tanpa sengkang pada klien dan pelayan.
3. Penyimpanan serta eksport nilai pilihan berbilang.
4. Pemetaan manual tersimpan mengikut Program dan tidak mengubah templat asal.
5. Halangan pembukaan sijil apabila templat atau pemetaan tidak lengkap.
6. PDF memaparkan sumber tetap dan slot peserta yang dipetakan dengan betul.
7. Aliran Program tanpa sijil: QR, pendaftaran, senarai peserta, CSV dan ketiadaan
   tindakan sijil.
8. Keserasian untuk Program serta templat sedia ada.
