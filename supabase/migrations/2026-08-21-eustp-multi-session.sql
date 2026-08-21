-- eUSTP tempahan lintas hari: satu event/QR, dengan sesi kehadiran harian.
-- Selamat dijalankan berulang kali dalam Supabase SQL Editor.

alter table public.events
  add column if not exists event_end_date date,
  add column if not exists external_source text,
  add column if not exists external_booking_id text;

create unique index if not exists events_external_booking_uidx
  on public.events (external_source, external_booking_id)
  where external_source is not null and external_booking_id is not null;

create table if not exists public.event_sessions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  session_date date not null,
  slot text not null default 'full_day' check (slot in ('am', 'pm', 'full_day')),
  created_at timestamptz not null default now(),
  unique(event_id, session_date, slot)
);

create table if not exists public.session_attendances (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.event_sessions(id) on delete cascade,
  attendee_id uuid not null references public.attendees(id) on delete cascade,
  method text not null default 'self' check (method in ('self', 'self_makeup', 'admin')),
  recorded_at timestamptz not null default now(),
  unique(session_id, attendee_id)
);

create index if not exists event_sessions_event_idx
  on public.event_sessions(event_id, session_date);

create index if not exists session_attendances_attendee_idx
  on public.session_attendances(attendee_id);

alter table public.event_sessions enable row level security;
alter table public.session_attendances enable row level security;
