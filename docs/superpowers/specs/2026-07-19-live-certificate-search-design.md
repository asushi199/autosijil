# Reka Bentuk: Carian Sijil Masa Nyata

## Tujuan

Membantu peserta mencari dan memuat turun sijil sendiri tanpa perlu mengingati
ejaan penuh nama. Hasil cadangan nama penuh dibenarkan oleh pengguna.

## Aliran Dipilih

Selepas peserta menaip sekurang-kurangnya tiga aksara, klien menunggu kira-kira
300ms lalu meminta cadangan daripada route awam. Route hanya berfungsi bagi
Program yang statusnya `released`, memadankan sebahagian nama tanpa peka huruf
besar/kecil, mengembalikan maksimum lapan nama penuh, dan tidak mengembalikan
ID atau token sijil.

Peserta mengklik satu cadangan. Klien kemudian memanggil semula route semakan
sedia ada dengan nama penuh itu; route tersebut kekal satu-satunya tempat yang
mengeluarkan token muat turun. Padanan nama pendua terus memaparkan arahan untuk
hubungi urus setia, supaya sijil tidak tersalah diberi.

## Had dan Perlindungan

- Tiada cadangan sebelum tiga aksara, atau apabila Program belum membuka sijil.
- Hasil dihadkan kepada lapan dan disusun mengikut nama.
- Carian nama penuh terus melalui butang `Semak` kekal berfungsi.
- Nama penuh ialah satu-satunya data pendedahan dalam cadangan, seperti yang
  diluluskan pengguna; IC, jawapan borang dan pautan sijil tidak dipulangkan.

## Pengesahan

- Ujian unit mengesahkan padanan separa, minimum tiga aksara dan had lapan hasil.
- Ujian route mengesahkan status Program sebelum hasil dikembalikan.
- Jalankan ujian penuh, lint dan binaan production sebelum push.
