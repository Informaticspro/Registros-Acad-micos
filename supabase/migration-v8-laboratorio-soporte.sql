-- Modulo de laboratorio y rol de soporte.
-- Ejecutar en Supabase cuando se quiera guardar laboratorio en la nube.

alter type public.app_role add value if not exists 'soporte';

create table if not exists public.laboratory_equipment (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  name text not null,
  category text not null,
  brand_model text not null default '',
  serial_number text not null default '',
  location text not null default '',
  status text not null default 'operativo',
  notes text not null default '',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.laboratory_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  work_date timestamptz not null default now(),
  work_type text not null,
  title text not null,
  description text not null,
  responsible text not null,
  priority text not null default 'media',
  status text not null default 'en_proceso',
  source_equipment text not null default '',
  target_equipment text not null default '',
  location text not null default '',
  evidence_title text not null default '',
  evidence_url text not null default '',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.laboratory_loans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  equipment text not null,
  delivered_to text not null,
  beneficiary_type text not null default 'estudiante',
  document_id text not null default '',
  delivered_by text not null,
  loaned_at timestamptz not null default now(),
  returned_at timestamptz,
  status text not null default 'activo',
  notes text not null default '',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.laboratory_equipment enable row level security;
alter table public.laboratory_logs enable row level security;
alter table public.laboratory_loans enable row level security;

drop policy if exists "laboratory_equipment_staff_read" on public.laboratory_equipment;
create policy "laboratory_equipment_staff_read"
on public.laboratory_equipment
for select
using (public.current_profile_role()::text in ('propietario', 'admin', 'soporte'));

drop policy if exists "laboratory_equipment_staff_write" on public.laboratory_equipment;
create policy "laboratory_equipment_staff_write"
on public.laboratory_equipment
for all
using (public.current_profile_role()::text in ('propietario', 'admin', 'soporte'))
with check (public.current_profile_role()::text in ('propietario', 'admin', 'soporte'));

drop policy if exists "laboratory_logs_staff_read" on public.laboratory_logs;
create policy "laboratory_logs_staff_read"
on public.laboratory_logs
for select
using (public.current_profile_role()::text in ('propietario', 'admin', 'soporte'));

drop policy if exists "laboratory_logs_staff_write" on public.laboratory_logs;
create policy "laboratory_logs_staff_write"
on public.laboratory_logs
for all
using (public.current_profile_role()::text in ('propietario', 'admin', 'soporte'))
with check (public.current_profile_role()::text in ('propietario', 'admin', 'soporte'));

drop policy if exists "laboratory_loans_staff_read" on public.laboratory_loans;
create policy "laboratory_loans_staff_read"
on public.laboratory_loans
for select
using (public.current_profile_role()::text in ('propietario', 'admin', 'soporte'));

drop policy if exists "laboratory_loans_staff_write" on public.laboratory_loans;
create policy "laboratory_loans_staff_write"
on public.laboratory_loans
for all
using (public.current_profile_role()::text in ('propietario', 'admin', 'soporte'))
with check (public.current_profile_role()::text in ('propietario', 'admin', 'soporte'));
