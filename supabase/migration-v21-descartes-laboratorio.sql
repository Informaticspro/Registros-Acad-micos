-- Registro formal de descartes de equipos del laboratorio.
-- Ejecutar en Supabase SQL Editor antes de usar la pestaña "Descartes".

create table if not exists public.laboratory_discards (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  equipment_id uuid references public.laboratory_equipment(id) on delete set null,
  discard_date timestamptz not null default now(),
  inventory_code text not null default '',
  equipment text not null default '',
  brand text not null default '',
  model text not null default '',
  serial_number text not null default '',
  detail text not null default '',
  location text not null default '',
  responsible text not null default '',
  evidence_title text not null default '',
  evidence_url text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.laboratory_discards
add column if not exists evidence_title text not null default '',
add column if not exists evidence_url text not null default '';

create index if not exists laboratory_discards_org_date_idx
on public.laboratory_discards (organization_id, discard_date desc);

create index if not exists laboratory_discards_equipment_idx
on public.laboratory_discards (equipment_id, discard_date desc);

alter table public.laboratory_discards enable row level security;

drop policy if exists "laboratory_discards_staff_read" on public.laboratory_discards;
create policy "laboratory_discards_staff_read"
on public.laboratory_discards
for select
using (
  public.current_profile_role()::text in ('propietario', 'admin', 'soporte')
  and organization_id = public.current_profile_organization_id()
);

drop policy if exists "laboratory_discards_staff_write" on public.laboratory_discards;
create policy "laboratory_discards_staff_write"
on public.laboratory_discards
for all
using (
  public.current_profile_role()::text in ('propietario', 'admin', 'soporte')
  and organization_id = public.current_profile_organization_id()
)
with check (
  public.current_profile_role()::text in ('propietario', 'admin', 'soporte')
  and organization_id = public.current_profile_organization_id()
);
