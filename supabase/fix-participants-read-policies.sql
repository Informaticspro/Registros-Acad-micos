drop policy if exists "participants_manage_admin_organizer" on public.participants;
drop policy if exists "participants_select_admin_organizer" on public.participants;
drop policy if exists "participants_insert_admin_organizer" on public.participants;
drop policy if exists "participants_update_admin_organizer" on public.participants;
drop policy if exists "participants_delete_admin" on public.participants;

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

create policy "participants_select_admin_organizer"
on public.participants for select
to authenticated
using (
  public.current_profile_role() in ('admin', 'organizador')
  and organization_id = public.current_profile_organization_id()
);

create policy "participants_insert_admin_organizer"
on public.participants for insert
to authenticated
with check (
  public.current_profile_role() in ('admin', 'organizador')
  and organization_id = public.current_profile_organization_id()
);

create policy "participants_update_admin_organizer"
on public.participants for update
to authenticated
using (
  public.current_profile_role() in ('admin', 'organizador')
  and organization_id = public.current_profile_organization_id()
)
with check (
  public.current_profile_role() in ('admin', 'organizador')
  and organization_id = public.current_profile_organization_id()
);

create policy "participants_delete_admin"
on public.participants for delete
to authenticated
using (
  public.current_profile_role() = 'admin'
  and organization_id = public.current_profile_organization_id()
);
