drop policy if exists "profiles_read_own_org" on public.profiles;
drop policy if exists "events_read_authenticated" on public.events;

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

create policy "profiles_read_own_org"
on public.profiles for select
to authenticated
using (id = auth.uid());

create policy "events_read_authenticated"
on public.events for select
to authenticated
using (organization_id = public.current_profile_organization_id());
