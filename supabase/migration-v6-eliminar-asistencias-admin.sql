-- Ejecutar en Supabase SQL Editor para permitir borrar marcajes desde la app.
-- Solo admin y organizador pueden eliminar asistencias de eventos de su organizacion.

drop policy if exists "attendance_daily_logs_delete_admin_organizer" on public.attendance_daily_logs;

create policy "attendance_daily_logs_delete_admin_organizer"
on public.attendance_daily_logs for delete
to authenticated
using (
  public.current_profile_role() in ('admin', 'organizador')
  and exists (
    select 1
    from public.events e
    where e.id = attendance_daily_logs.event_id
      and e.organization_id = public.current_profile_organization_id()
  )
);
