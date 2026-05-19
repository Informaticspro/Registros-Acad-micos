alter table public.events
  alter column starts_at drop not null,
  alter column ends_at drop not null;
