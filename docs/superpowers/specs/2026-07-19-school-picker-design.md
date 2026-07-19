# Reka Bentuk: Pencari Direktori Sekolah

## Tujuan

Memudahkan peserta memilih sekolah daripada 102 rekod tanpa menatal senarai
panjang. Pilihan sentiasa disusun mengikut kod sekolah dan boleh dicari melalui
kod atau nama sekolah.

## Reka Bentuk Dipilih

Gantikan kawalan `<select>` biasa bagi medan `Direktori Sekolah` dengan komponen
carian kecil. Apabila diketuk, komponen memaparkan input carian dan senarai
pilihan `KOD — NAMA`; hasil ditapis tanpa mengubah senarai asal. Memilih hasil
menyimpan kod sekolah yang sama seperti sebelum ini.

Carian tidak peka huruf besar/kecil dan memadankan mana-mana bahagian kod atau
nama, contohnya `ABA10` dan `DENDANG`. Data sekolah pada semua query aplikasi
disusun `code` menaik, bukannya `name` menaik.

## Alternatif Ditolak

- Kekalkan `<select>`: hanya boleh susun mengikut kod; carian pelayar tidak
  konsisten pada telefon.
- `datalist`: membenarkan teks bebas dan melemahkan pemilihan kod sah.

## Lokasi Pelbagai Tempat

Tiada sumber templat baharu diperlukan. Untuk Program yang berjalan di beberapa
lokasi serentak, admin menambah medan `Tempat Kursus / Lokasi` sebagai senarai
pilihan, menandakan medan itu boleh dicetak pada sijil, kemudian memetakannya
secara manual ke `participant slot` dalam templat. Medan lokasi Program yang
tetap hanya digunakan apabila semua peserta berada di tempat yang sama.

## Pengesahan

- Ujian unit mengesahkan carian kod/nama dan susunan kod.
- Pemilihan masih menghantar kod sekolah yang sah ke route kehadiran.
- Jalankan ujian penuh, lint dan binaan production sebelum push.
