-- Templat khas program (disembunyikan dari senarai induk Urus Templat)
alter table public.templates
  add column if not exists owner_event_id uuid references public.events(id) on delete cascade,
  add column if not exists source_template_id uuid references public.templates(id) on delete set null;

create unique index if not exists templates_owner_event_uidx
  on public.templates (owner_event_id)
  where owner_event_id is not null;
