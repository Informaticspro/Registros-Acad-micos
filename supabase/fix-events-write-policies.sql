drop policy if exists "events_manage_admin_organizer" on public.events;
drop policy if exists "events_insert_admin_organizer" on public.events;
drop policy if exists "events_update_admin_organizer" on public.events;
drop policy if exists "events_delete_admin_organizer" on public.events;

create or replace function public.current_profile_role()
returns public.app_role
language sql
security definer
stable
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.current_profile_organization_id()
returns uuid
language sql
security definer
stable
as $$
  select organization_id from public.profiles where id = auth.uid()
$$;

create policy "events_insert_admin_organizer"
on public.events for insert
to authenticated
with check (
  public.current_profile_role() in ('admin', 'organizador')
  and organization_id = public.current_profile_organization_id()
  and organizer_id = auth.uid()
);

create policy "events_update_admin_organizer"
on public.events for update
to authenticated
using (
  public.current_profile_role() in ('admin', 'organizador')
  and organization_id = public.current_profile_organization_id()
)
with check (
  public.current_profile_role() in ('admin', 'organizador')
  and organization_id = public.current_profile_organization_id()
);

create policy "events_delete_admin_organizer"
on public.events for delete
to authenticated
using (
  public.current_profile_role() = 'admin'
  and organization_id = public.current_profile_organization_id()
);
