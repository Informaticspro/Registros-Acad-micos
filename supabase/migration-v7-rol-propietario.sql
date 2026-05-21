-- Ejecutar en Supabase SQL Editor para habilitar la cuenta propietaria.
-- Despues de ejecutar este archivo, promueva su correo con:
-- update public.profiles set role = 'propietario' where lower(email) = lower('SU_CORREO_ADMIN');

alter type public.app_role add value if not exists 'propietario';

drop policy if exists "events_insert_admin_organizer" on public.events;
create policy "events_insert_admin_organizer"
on public.events for insert
to authenticated
with check (
  public.current_profile_role()::text in ('propietario', 'admin', 'organizador')
  and organization_id = public.current_profile_organization_id()
  and organizer_id = auth.uid()
);

drop policy if exists "events_update_admin_organizer" on public.events;
create policy "events_update_admin_organizer"
on public.events for update
to authenticated
using (
  public.current_profile_role()::text in ('propietario', 'admin', 'organizador')
  and organization_id = public.current_profile_organization_id()
)
with check (
  public.current_profile_role()::text in ('propietario', 'admin', 'organizador')
  and organization_id = public.current_profile_organization_id()
);

drop policy if exists "events_delete_admin_organizer" on public.events;
create policy "events_delete_admin_organizer"
on public.events for delete
to authenticated
using (
  public.current_profile_role()::text in ('propietario', 'admin')
  and organization_id = public.current_profile_organization_id()
);

drop policy if exists "participants_select_admin_organizer" on public.participants;
create policy "participants_select_admin_organizer"
on public.participants for select
to authenticated
using (
  public.current_profile_role()::text in ('propietario', 'admin', 'organizador')
  and organization_id = public.current_profile_organization_id()
);

drop policy if exists "participants_insert_admin_organizer" on public.participants;
create policy "participants_insert_admin_organizer"
on public.participants for insert
to authenticated
with check (
  public.current_profile_role()::text in ('propietario', 'admin', 'organizador')
  and organization_id = public.current_profile_organization_id()
);

drop policy if exists "participants_update_admin_organizer" on public.participants;
create policy "participants_update_admin_organizer"
on public.participants for update
to authenticated
using (
  public.current_profile_role()::text in ('propietario', 'admin', 'organizador')
  and organization_id = public.current_profile_organization_id()
)
with check (
  public.current_profile_role()::text in ('propietario', 'admin', 'organizador')
  and organization_id = public.current_profile_organization_id()
);

drop policy if exists "participants_delete_admin" on public.participants;
create policy "participants_delete_admin"
on public.participants for delete
to authenticated
using (
  public.current_profile_role()::text in ('propietario', 'admin')
  and organization_id = public.current_profile_organization_id()
);

drop policy if exists "registrations_manage_admin_organizer" on public.registrations;
create policy "registrations_manage_admin_organizer"
on public.registrations for all
to authenticated
using (public.current_profile_role()::text in ('propietario', 'admin', 'organizador'))
with check (public.current_profile_role()::text in ('propietario', 'admin', 'organizador'));

drop policy if exists "attendance_manage_scanners" on public.attendance_records;
create policy "attendance_manage_scanners"
on public.attendance_records for all
to authenticated
using (public.current_profile_role()::text in ('propietario', 'admin', 'organizador', 'scanner'))
with check (public.current_profile_role()::text in ('propietario', 'admin', 'organizador', 'scanner'));

drop policy if exists "attendance_daily_logs_select_staff" on public.attendance_daily_logs;
create policy "attendance_daily_logs_select_staff"
on public.attendance_daily_logs for select
to authenticated
using (
  public.current_profile_role()::text in ('propietario', 'admin', 'organizador', 'scanner')
  and exists (
    select 1 from public.events e
    where e.id = attendance_daily_logs.event_id
      and e.organization_id = public.current_profile_organization_id()
  )
);

drop policy if exists "attendance_daily_logs_insert_staff" on public.attendance_daily_logs;
create policy "attendance_daily_logs_insert_staff"
on public.attendance_daily_logs for insert
to authenticated
with check (
  public.current_profile_role()::text in ('propietario', 'admin', 'organizador', 'scanner')
  and exists (
    select 1 from public.events e
    where e.id = attendance_daily_logs.event_id
      and e.organization_id = public.current_profile_organization_id()
  )
);

drop policy if exists "attendance_daily_logs_delete_admin_organizer" on public.attendance_daily_logs;
create policy "attendance_daily_logs_delete_admin_organizer"
on public.attendance_daily_logs for delete
to authenticated
using (
  public.current_profile_role()::text in ('propietario', 'admin', 'organizador')
  and exists (
    select 1 from public.events e
    where e.id = attendance_daily_logs.event_id
      and e.organization_id = public.current_profile_organization_id()
  )
);

drop policy if exists "profiles_select_admin_organization" on public.profiles;
create policy "profiles_select_admin_organization"
on public.profiles for select
to authenticated
using (
  id = auth.uid()
  or (
    public.current_profile_role()::text in ('propietario', 'admin')
    and organization_id = public.current_profile_organization_id()
  )
);

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin"
on public.profiles for update
to authenticated
using (
  public.current_profile_role()::text in ('propietario', 'admin')
  and organization_id = public.current_profile_organization_id()
  and role::text <> 'propietario'
)
with check (
  public.current_profile_role()::text in ('propietario', 'admin')
  and organization_id = public.current_profile_organization_id()
  and role::text <> 'propietario'
);

drop function if exists public.admin_assign_staff_profile(uuid, text, text, public.app_role);
create or replace function public.admin_assign_staff_profile(
  p_user_id uuid,
  p_full_name text,
  p_email text,
  p_role public.app_role
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
begin
  if public.current_profile_role()::text not in ('propietario', 'admin') then
    raise exception 'Solo propietarios o administradores pueden crear usuarios';
  end if;

  if p_role::text = 'propietario' then
    raise exception 'El rol propietario solo se asigna desde Supabase SQL Editor';
  end if;

  v_org := public.current_profile_organization_id();
  if v_org is null then
    raise exception 'Tu usuario no tiene organizacion asignada';
  end if;

  insert into public.profiles (id, organization_id, full_name, email, role)
  values (p_user_id, v_org, trim(p_full_name), lower(trim(p_email)), p_role)
  on conflict (id) do update set
    organization_id = excluded.organization_id,
    full_name = excluded.full_name,
    email = excluded.email,
    role = excluded.role
  where public.profiles.role::text <> 'propietario';
end;
$$;

grant execute on function public.admin_assign_staff_profile(uuid, text, text, public.app_role) to authenticated;

drop function if exists public.admin_disable_staff_profile(uuid);
create or replace function public.admin_disable_staff_profile(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target_role text;
begin
  if public.current_profile_role()::text not in ('propietario', 'admin') then
    raise exception 'Solo propietarios o administradores pueden desactivar usuarios';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'No puedes desactivar tu propio usuario';
  end if;

  select role::text into v_target_role
  from public.profiles
  where id = p_user_id
    and organization_id = public.current_profile_organization_id();

  if v_target_role = 'propietario' then
    raise exception 'La cuenta propietaria esta protegida';
  end if;

  delete from public.profiles
  where id = p_user_id
    and organization_id = public.current_profile_organization_id()
    and role::text <> 'propietario';
end;
$$;

grant execute on function public.admin_disable_staff_profile(uuid) to authenticated;
