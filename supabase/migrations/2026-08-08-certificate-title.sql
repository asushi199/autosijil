-- Nama program pada sijil (boleh ada baris baharu); null/kosong → guna title
alter table public.events
  add column if not exists certificate_title text;
