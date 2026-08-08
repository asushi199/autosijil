# Reka Bentuk: Templat Khas Program (disembunyikan dari senarai induk)

## Tujuan

Dari halaman edit program, pentadbir boleh membuka editor templat penuh (fon,
lebar kotak, pratonton kanvas) untuk **salinan khas program itu sahaja**. Senarai
Urus Templat hanya memaparkan templat induk (library).

## Keputusan

- Salin atas permintaan (`customizeEventTemplate`), bukan auto-salin bila pilih dropdown.
- `templates.owner_event_id` (nullable, unique) — jika diisi, templat khas program.
- `templates.source_template_id` (nullable) — templat induk asal.
- Senarai `/admin/templates`: `owner_event_id IS NULL` sahaja.
- Dropdown program: templat induk + templat khas program semasa (jika ada).
- Latar disalin (seperti `duplicateTemplate`) supaya padam selamat.
- `certificate_title` kekal untuk baris manual nama program; editor khas guna nilai program untuk pratonton.
- Padam program → cascade padam templat khas (`ON DELETE CASCADE` pada `owner_event_id`).
