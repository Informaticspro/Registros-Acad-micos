-- Catalogo administrable de secciones/ubicaciones del laboratorio.
-- Ejecutar en Supabase SQL Editor para permitir crear, editar y eliminar secciones desde la app.

create table if not exists public.laboratory_sections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text not null default '',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint laboratory_sections_org_name_unique unique (organization_id, name)
);

alter table public.laboratory_sections enable row level security;

drop policy if exists "laboratory_sections_staff_read" on public.laboratory_sections;
create policy "laboratory_sections_staff_read"
on public.laboratory_sections
for select
using (
  public.current_profile_role()::text in ('propietario', 'admin', 'soporte')
  and organization_id = public.current_profile_organization_id()
);

drop policy if exists "laboratory_sections_staff_write" on public.laboratory_sections;
create policy "laboratory_sections_staff_write"
on public.laboratory_sections
for all
using (
  public.current_profile_role()::text in ('propietario', 'admin', 'soporte')
  and organization_id = public.current_profile_organization_id()
)
with check (
  public.current_profile_role()::text in ('propietario', 'admin', 'soporte')
  and organization_id = public.current_profile_organization_id()
);

insert into public.laboratory_sections (organization_id, name, description)
select o.id, section_name, ''
from public.organizations o
cross join (
  values
    ('ORD'),
    ('Biblioteca'),
    ('Laboratorio 1'),
    ('Laboratorio 2'),
    ('Decanato'),
    ('Reparacion'),
    ('Deposito'),
    ('Seccion de Tecnologia')
) as base_sections(section_name)
on conflict (organization_id, name) do nothing;
