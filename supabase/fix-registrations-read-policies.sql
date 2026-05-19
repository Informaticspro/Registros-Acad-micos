drop policy if exists "registrations_manage_admin_organizer" on public.registrations;
drop policy if exists "registrations_select_admin_organizer" on public.registrations;
drop policy if exists "registrations_insert_admin_organizer" on public.registrations;
drop policy if exists "registrations_update_admin_organizer" on public.registrations;
drop policy if exists "registrations_delete_admin" on public.registrations;

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

create policy "registrations_select_admin_organizer"
on public.registrations for select
to authenticated
using (
  public.current_profile_role() in ('admin', 'organizador')
  and exists (
    select 1
    from public.events e
    where e.id = registrations.event_id
      and e.organization_id = public.current_profile_organization_id()
  )
);

create policy "registrations_insert_admin_organizer"
on public.registrations for insert
to authenticated
with check (
  public.current_profile_role() in ('admin', 'organizador')
  and exists (
    select 1
    from public.events e
    where e.id = registrations.event_id
      and e.organization_id = public.current_profile_organization_id()
  )
);

create policy "registrations_update_admin_organizer"
on public.registrations for update
to authenticated
using (
  public.current_profile_role() in ('admin', 'organizador')
  and exists (
    select 1
    from public.events e
    where e.id = registrations.event_id
      and e.organization_id = public.current_profile_organization_id()
  )
)
with check (
  public.current_profile_role() in ('admin', 'organizador')
  and exists (
    select 1
    from public.events e
    where e.id = registrations.event_id
      and e.organization_id = public.current_profile_organization_id()
  )
);

create policy "registrations_delete_admin"
on public.registrations for delete
to authenticated
using (
  public.current_profile_role() = 'admin'
  and exists (
    select 1
    from public.events e
    where e.id = registrations.event_id
      and e.organization_id = public.current_profile_organization_id()
  )
);
