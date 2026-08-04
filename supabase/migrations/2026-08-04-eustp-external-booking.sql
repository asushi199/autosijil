-- Integrasi eUSTP: pautan event ↔ booking luar (idempotent)
alter table public.events
  add column if not exists external_source text,
  add column if not exists external_booking_id text;

create unique index if not exists events_external_booking_uidx
  on public.events (external_source, external_booking_id)
  where external_source is not null and external_booking_id is not null;
