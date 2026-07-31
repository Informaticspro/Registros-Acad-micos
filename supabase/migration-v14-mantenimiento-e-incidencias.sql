-- Registros de mantenimiento e incidencias por equipo.
alter table public.laboratory_logs
  add column if not exists entry_type text not null default 'mantenimiento'
    check (entry_type in ('mantenimiento', 'incidencia')),
  add column if not exists equipment_id uuid references public.laboratory_equipment(id) on delete set null;

create index if not exists laboratory_logs_equipment_date_idx
  on public.laboratory_logs (equipment_id, work_date desc);
