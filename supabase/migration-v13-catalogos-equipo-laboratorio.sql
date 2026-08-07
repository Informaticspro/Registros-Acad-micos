-- Catalogos administrables para categorias y estados de equipos del laboratorio.
-- Ejecutar en Supabase SQL Editor despues de migration-v12-secciones-laboratorio.sql.

create table if not exists public.laboratory_catalogs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  catalog_type text not null check (catalog_type in ('categoria_equipo', 'estado_equipo')),
  name text not null,
  description text not null default '',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint laboratory_catalogs_org_type_name_unique unique (organization_id, catalog_type, name)
);

alter table public.laboratory_catalogs enable row level security;

drop policy if exists "laboratory_catalogs_staff_read" on public.laboratory_catalogs;
create policy "laboratory_catalogs_staff_read"
on public.laboratory_catalogs
for select
using (
  public.current_profile_role()::text in ('propietario', 'admin', 'soporte')
  and organization_id = public.current_profile_organization_id()
);

drop policy if exists "laboratory_catalogs_staff_write" on public.laboratory_catalogs;
create policy "laboratory_catalogs_staff_write"
on public.laboratory_catalogs
for all
using (
  public.current_profile_role()::text in ('propietario', 'admin', 'soporte')
  and organization_id = public.current_profile_organization_id()
)
with check (
  public.current_profile_role()::text in ('propietario', 'admin', 'soporte')
  and organization_id = public.current_profile_organization_id()
);

insert into public.laboratory_catalogs (organization_id, catalog_type, name, description)
select o.id, item.catalog_type, item.name, item.description
from public.organizations o
cross join (
  values
    ('categoria_equipo', 'Computadora', ''),
    ('categoria_equipo', 'Laptop', ''),
    ('categoria_equipo', 'Monitor', ''),
    ('categoria_equipo', 'Televisor', ''),
    ('categoria_equipo', 'Proyector', ''),
    ('categoria_equipo', 'Impresora', ''),
    ('categoria_equipo', 'Redes', ''),
    ('categoria_equipo', 'Accesorio', ''),
    ('estado_equipo', 'operativo', 'Operativo'),
    ('estado_equipo', 'en_reparacion', 'En reparacion'),
    ('estado_equipo', 'prestado', 'Prestado'),
    ('estado_equipo', 'pendiente_revision', 'Pendiente de revision'),
    ('estado_equipo', 'baja', 'Baja')
) as item(catalog_type, name, description)
on conflict (organization_id, catalog_type, name) do nothing;
