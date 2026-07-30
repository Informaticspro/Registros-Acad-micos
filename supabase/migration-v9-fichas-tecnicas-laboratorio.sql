-- Fichas tecnicas del laboratorio.
-- Ejecutar despues de migration-v8-laboratorio-soporte.sql.

alter type public.app_role add value if not exists 'soporte';

create table if not exists public.laboratory_technical_sheets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  sheet_date timestamptz not null default now(),
  pc text not null,
  ip_address text not null default '',
  location text not null default '',
  responsible text not null default '',
  assigned_user text not null default '',
  access_reference text not null default '',
  applications jsonb not null default '[]'::jsonb,
  technical_specs jsonb not null default '[]'::jsonb,
  inventory jsonb not null default '[]'::jsonb,
  actions jsonb not null default '[]'::jsonb,
  general_notes text not null default '',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.laboratory_technical_sheets enable row level security;

drop policy if exists "laboratory_technical_sheets_staff_read" on public.laboratory_technical_sheets;
create policy "laboratory_technical_sheets_staff_read"
on public.laboratory_technical_sheets
for select
using (public.current_profile_role()::text in ('propietario', 'admin', 'soporte'));

drop policy if exists "laboratory_technical_sheets_staff_write" on public.laboratory_technical_sheets;
create policy "laboratory_technical_sheets_staff_write"
on public.laboratory_technical_sheets
for all
using (public.current_profile_role()::text in ('propietario', 'admin', 'soporte'))
with check (public.current_profile_role()::text in ('propietario', 'admin', 'soporte'));
