-- Permite que los organizadores tambien puedan eliminar eventos de su organizacion.
-- Ejecutar en Supabase SQL Editor si la eliminacion de eventos falla con rol organizador.

drop policy if exists "events_delete_admin_organizer" on public.events;

create policy "events_delete_admin_organizer"
on public.events for delete
to authenticated
using (
  public.current_profile_role()::text in ('propietario', 'admin', 'organizador')
  and organization_id = public.current_profile_organization_id()
);
