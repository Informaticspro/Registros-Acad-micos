-- Se ejecuta antes de asignar el nuevo rol a una cuenta.
alter type public.app_role add value if not exists 'recepcion';

-- Restricciones adicionales: recepción no puede leer ni modificar datos internos,
-- aunque una política anterior permita acceso a todos los usuarios autenticados.
-- Su propio perfil es necesario para recuperar el rol y la organización al entrar.
do $$
declare t record;
begin
  for t in select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind='r' and c.relrowsecurity
  loop
    execute format('drop policy if exists reception_restricted_access on public.%I', t.relname);
    if t.relname='profiles' then
      execute 'create policy reception_restricted_access on public.profiles as restrictive for all to authenticated
        using (coalesce(public.current_profile_role()::text, '''') <> ''recepcion'' or id=auth.uid())
        with check (coalesce(public.current_profile_role()::text, '''') <> ''recepcion'')';
    else
      execute format('create policy reception_restricted_access on public.%I as restrictive for all to authenticated
        using (coalesce(public.current_profile_role()::text, '''') <> ''recepcion'')
        with check (coalesce(public.current_profile_role()::text, '''') <> ''recepcion'')', t.relname);
    end if;
  end loop;
end $$;
notify pgrst, 'reload schema';
