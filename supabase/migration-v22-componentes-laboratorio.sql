-- Asignacion de componentes fisicos a equipos del laboratorio.
-- Permite relacionar CPU, monitor, teclado, mouse, proyector u otra pieza con una PC
-- sin modificar ni dividir automaticamente el inventario existente.

create table if not exists public.laboratory_component_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  parent_equipment_id uuid not null references public.laboratory_equipment(id) on delete cascade,
  component_equipment_id uuid not null references public.laboratory_equipment(id) on delete cascade,
  component_type text not null default 'otro',
  assigned_at timestamptz not null default now(),
  removed_at timestamptz,
  detail text not null default '',
  responsible text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint laboratory_component_not_self check (parent_equipment_id <> component_equipment_id)
);

create unique index if not exists laboratory_component_assignments_active_component_idx
on public.laboratory_component_assignments (organization_id, component_equipment_id)
where removed_at is null;

create index if not exists laboratory_component_assignments_parent_idx
on public.laboratory_component_assignments (organization_id, parent_equipment_id, assigned_at desc);

create index if not exists laboratory_component_assignments_component_idx
on public.laboratory_component_assignments (organization_id, component_equipment_id, assigned_at desc);

alter table public.laboratory_component_assignments enable row level security;

drop policy if exists "laboratory_component_assignments_staff_read" on public.laboratory_component_assignments;
create policy "laboratory_component_assignments_staff_read"
on public.laboratory_component_assignments
for select
using (
  public.current_profile_role()::text in ('propietario', 'admin', 'soporte')
  and organization_id = public.current_profile_organization_id()
);

drop policy if exists "laboratory_component_assignments_staff_write" on public.laboratory_component_assignments;
create policy "laboratory_component_assignments_staff_write"
on public.laboratory_component_assignments
for all
using (
  public.current_profile_role()::text in ('propietario', 'admin', 'soporte')
  and organization_id = public.current_profile_organization_id()
)
with check (
  public.current_profile_role()::text in ('propietario', 'admin', 'soporte')
  and organization_id = public.current_profile_organization_id()
);
