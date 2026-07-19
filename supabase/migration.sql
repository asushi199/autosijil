-- Sistem e-Sijil & Kehadiran — skema pangkalan data
-- Jalankan sekali dalam Supabase: SQL Editor > New query > tampal semua > Run

create extension if not exists pgcrypto;

-- ============ Jadual ============

create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  bg_image_path text,
  orientation text not null default 'landscape' check (orientation in ('portrait','landscape')),
  elements jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  event_date date,
  location text,
  status text not null default 'draft' check (status in ('draft','open','closed','released')),
  form_fields jsonb not null default '[]'::jsonb,
  template_id uuid references public.templates(id) on delete set null,
  created_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.attendees (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  name_value text not null,
  ic_value text,
  created_at timestamptz not null default now()
);

create index if not exists attendees_event_idx on public.attendees(event_id);
create index if not exists attendees_name_idx on public.attendees(event_id, lower(name_value));
create index if not exists attendees_ic_idx on public.attendees(event_id, ic_value);

create table if not exists public.school_directory (
  code text primary key,
  name text not null,
  zone text not null,
  source_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Elak rekod kehadiran berganda (nama + IC sama dalam majlis sama)
create unique index if not exists attendees_dedupe_idx
  on public.attendees(event_id, lower(name_value), coalesce(ic_value, ''));

-- ============ RLS ============
-- Semua akses aplikasi melalui service role (route handlers) yang membuat
-- semakan kebenaran sendiri. RLS dihidupkan supaya kunci anon tidak boleh
-- membaca/menulis apa-apa secara terus.

alter table public.templates enable row level security;
alter table public.events enable row level security;
alter table public.attendees enable row level security;
alter table public.school_directory enable row level security;

-- ============ Storan ============
-- Baldi awam untuk imej latar templat (dibaca terus oleh editor pratonton)

insert into storage.buckets (id, name, public)
values ('templates', 'templates', true)
on conflict (id) do nothing;

-- ============ Borang fleksibel & sijil boleh guna semula ============

alter table public.events
  add column if not exists requires_certificate boolean not null default true,
  add column if not exists certificate_field_mappings jsonb not null default '{}'::jsonb;
