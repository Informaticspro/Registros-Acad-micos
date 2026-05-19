-- =============================================================================
-- Usuarios administrados desde localhost
-- Ejecutar en Supabase SQL Editor.
-- Permite que un admin liste, edite y desactive perfiles de usuarios.
-- La creacion usa Supabase Auth desde la app y luego admin_assign_staff_profile.
-- =============================================================================

drop policy if exists "profiles_select_admin_organization" on public.profiles;
create policy "profiles_select_admin_organization"
on public.profiles for select
to authenticated
using (
  id = auth.uid()
  or (
    public.current_profile_role() = 'admin'
    and organization_id = public.current_profile_organization_id()
  )
);

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin"
on public.profiles for update
to authenticated
using (
  public.current_profile_role() = 'admin'
  and organization_id = public.current_profile_organization_id()
)
with check (
  public.current_profile_role() = 'admin'
  and organization_id = public.current_profile_organization_id()
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
  if public.current_profile_role() <> 'admin' then
    raise exception 'Solo administradores pueden crear usuarios';
  end if;

  v_org := public.current_profile_organization_id();
  if v_org is null then
    raise exception 'Tu usuario admin no tiene organizacion asignada';
  end if;

  insert into public.profiles (id, organization_id, full_name, email, role)
  values (p_user_id, v_org, trim(p_full_name), lower(trim(p_email)), p_role)
  on conflict (id) do update set
    organization_id = excluded.organization_id,
    full_name = excluded.full_name,
    email = excluded.email,
    role = excluded.role;
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
begin
  if public.current_profile_role() <> 'admin' then
    raise exception 'Solo administradores pueden desactivar usuarios';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'No puedes desactivar tu propio usuario';
  end if;

  delete from public.profiles
  where id = p_user_id
    and organization_id = public.current_profile_organization_id();
end;
$$;

grant execute on function public.admin_disable_staff_profile(uuid) to authenticated;
