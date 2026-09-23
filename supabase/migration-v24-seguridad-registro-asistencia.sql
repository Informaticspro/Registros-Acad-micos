-- Apply after v23. Transactional; preserves all existing attendance and registrations.
begin;
-- Private deployment ledger and definitions for investigation/controlled rollback.
-- This is not a substitute for a full database backup.
create schema if not exists app_migrations;
revoke all on schema app_migrations from public, anon, authenticated;
create table if not exists app_migrations.history (
  version text primary key,
  applied_at timestamptz not null default now(),
  previous_definitions jsonb not null
);
alter table app_migrations.history enable row level security;
insert into app_migrations.history(version, previous_definitions)
select 'v24-seguridad-registro-asistencia', jsonb_build_object(
  'functions', (select jsonb_agg(pg_get_functiondef(p.oid)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in ('public_event_check_in','record_daily_attendance','lookup_participant_registration','admin_assign_staff_profile')),
  'policies', (select jsonb_agg(to_jsonb(p)) from pg_policies p where schemaname='public'
    and tablename in ('registrations','attendance_records','attendance_daily_logs'))
)
on conflict (version) do nothing;
-- NULL preserves the participant-metadata fallback for historical registrations.
alter table public.registrations add column if not exists registration_metadata jsonb;
create or replace function public.public_event_check_in(
  p_event_id uuid,
  p_first_name text,
  p_last_name text,
  p_document_id text,
  p_email text,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  result_participant_id uuid,
  result_registration_id uuid,
  result_attendance_id uuid,
  result_certificate_code text,
  result_qr_token text,
  result_already_checked_in boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events%rowtype;
  v_participant_id uuid;
  v_participant_by_document uuid;
  v_participant_by_email uuid;
  v_registration public.registrations%rowtype;
  v_attendance_id uuid;
  v_already_checked_in boolean := false;

begin
  if length(trim(p_first_name)) < 2 or length(trim(p_last_name)) < 2
     or length(trim(p_document_id)) < 4 or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
     or p_first_name is null or p_last_name is null or p_document_id is null or p_email is null then
    raise exception 'Complete correctamente los datos de inscripción';
  end if;
  select *
  into v_event
  from public.events
  where id = p_event_id for update;

  if not found then
    raise exception 'Evento no encontrado';
  end if;

  if v_event.status in ('published', 'active') and (v_event.is_permanent or v_event.ends_at is null or v_event.ends_at >= now()) then
    null;
  else
    raise exception 'Evento no disponible para registro';
  end if;

  select id
  into v_participant_by_document
  from public.participants
  where organization_id = v_event.organization_id
    and document_id = trim(p_document_id)
  limit 1;

  select id
  into v_participant_by_email
  from public.participants
  where organization_id = v_event.organization_id
    and email = lower(trim(p_email))
  limit 1;

  if v_participant_by_document is not null
    and v_participant_by_email is not null
    and v_participant_by_document <> v_participant_by_email then
    raise exception 'La cedula y el correo pertenecen a participantes diferentes. Verifique los datos o contacte al administrador.';
  end if;

  if (v_participant_by_document is not null or v_participant_by_email is not null)
    and v_participant_by_document is distinct from v_participant_by_email then
    raise exception 'No se pudo validar la inscripción. Contacte al organizador.';
  end if;
  v_participant_id := coalesce(v_participant_by_document, v_participant_by_email);
  if exists (select 1 from public.registrations where event_id = p_event_id and participant_id = v_participant_id) then
    raise exception 'La inscripción ya existe. Use su código de recuperación o contacte al organizador.';
  end if;
  if v_event.capacity > 0 and (select count(*) from public.registrations where event_id = p_event_id) >= v_event.capacity then
    raise exception 'El evento alcanzó su capacidad máxima';
  end if;

  if v_participant_id is null then
    insert into public.participants (
      organization_id,
      first_name,
      last_name,
      email,
      document_id,
      institution,
      metadata
    )
    values (
      v_event.organization_id,
      trim(p_first_name),
      trim(p_last_name),
      lower(trim(p_email)),
      trim(p_document_id),
      coalesce(nullif(p_metadata->>'institution', ''), ''),
      coalesce(p_metadata, '{}'::jsonb)
    )
    returning id into v_participant_id;
  end if;

  insert into public.registrations (event_id, participant_id, registration_metadata)
  values (p_event_id, v_participant_id, coalesce(p_metadata, '{}'::jsonb))
  returning * into v_registration;

  return query select
    v_participant_id,
    v_registration.id,
    v_attendance_id,
    v_registration.certificate_code,
    v_registration.qr_token,
    v_already_checked_in;
end;
$$;

grant execute on function public.public_event_check_in(uuid, text, text, text, text, jsonb) to anon, authenticated;


create or replace function public.record_daily_attendance(
  p_event_id uuid,
  p_lookup text,
  p_attendance_period text default 'matutina'
)
returns table (
  result_participant_name text,
  result_document_id text,
  result_certificate_code text,
  result_checked_in_at timestamptz,
  result_attendance_period text,
  result_already_logged_today boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_registration public.registrations%rowtype;
  v_participant public.participants%rowtype;
  v_checked_in_at timestamptz := now();
  v_existing_checked_in_at timestamptz;
  v_period text := case
    when p_attendance_period = 'vespertina' then 'vespertina'
    else 'matutina'
  end;
begin
  if auth.uid() is null then
    raise exception 'Debe iniciar sesion para escanear asistencia';
  end if;

  if not exists (
    select 1 from public.profiles p join public.events e on e.organization_id = p.organization_id
    where p.id = auth.uid() and e.id = p_event_id
      and p.role::text in ('propietario', 'admin', 'organizador', 'scanner')
      and e.status in ('published', 'active')
      and (e.is_permanent or ((e.starts_at is null or e.starts_at <= now()) and (e.ends_at is null or e.ends_at >= now())))
  ) then raise exception 'No tiene permiso para registrar asistencia en este evento'; end if;

  select r.*
  into v_registration
  from public.registrations r
  where r.event_id = p_event_id
    and (
      r.qr_token = trim(p_lookup)
      or exists (
        select 1
        from public.participants p
        where p.id = r.participant_id
          and p.document_id = trim(p_lookup)
      )
    )
  limit 1;

  if not found then
    raise exception 'Participante no inscrito en este evento';
  end if;

  select *
  into v_participant
  from public.participants
  where id = v_registration.participant_id;

  -- Evita que dos lecturas casi simultaneas creen doble marcaje.
  perform pg_advisory_xact_lock(
    hashtext(v_registration.id::text || ':' || v_period || ':' || (v_checked_in_at at time zone 'America/Panama')::date::text)
  );

  select l.checked_in_at
  into v_existing_checked_in_at
  from public.attendance_daily_logs l
  where l.registration_id = v_registration.id
    and l.attendance_period = v_period
    and (l.checked_in_at at time zone 'America/Panama')::date = (v_checked_in_at at time zone 'America/Panama')::date
  order by l.checked_in_at asc
  limit 1;

  if v_existing_checked_in_at is not null then
    return query select
      trim(v_participant.first_name || ' ' || v_participant.last_name),
      v_participant.document_id,
      v_registration.certificate_code,
      v_existing_checked_in_at,
      v_period,
      true;
    return;
  end if;

  insert into public.attendance_daily_logs (
    event_id,
    registration_id,
    scanned_by,
    checked_in_at,
    attendance_period
  )
  values (
    p_event_id,
    v_registration.id,
    auth.uid(),
    v_checked_in_at,
    v_period
  );

  return query select
    trim(v_participant.first_name || ' ' || v_participant.last_name),
    v_participant.document_id,
    v_registration.certificate_code,
    v_checked_in_at,
    v_period,
    false;
end;
$$;

grant execute on function public.record_daily_attendance(uuid, text, text) to authenticated;

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

  if exists (select 1 from public.profiles where id = p_user_id and (organization_id is distinct from v_org or role::text = 'propietario')) then
    raise exception 'El usuario no puede reasignarse';
  end if;
  if not exists (select 1 from auth.users where id = p_user_id and lower(email) = lower(trim(p_email))) then
    raise exception 'La identidad no coincide con el usuario autenticado';
  end if;
  insert into public.profiles (id, organization_id, full_name, email, role)
  values (p_user_id, v_org, trim(p_full_name), lower(trim(p_email)), p_role)
  on conflict (id) do update set
    organization_id = excluded.organization_id,
    full_name = excluded.full_name,
    email = excluded.email,
    role = excluded.role
  where public.profiles.role::text <> 'propietario' and public.profiles.organization_id = v_org;
end;
$$;

grant execute on function public.admin_assign_staff_profile(uuid, text, text, public.app_role) to authenticated;


create or replace function public.lookup_participant_registration(
  p_event_id uuid,
  p_document_id text,
  p_certificate_code text
)
returns table (
  result_first_name text,
  result_last_name text,
  result_document_id text,
  result_email text,
  result_qr_token text,
  result_certificate_code text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events%rowtype;
begin
  select * into v_event from public.events where id = p_event_id;

  if not found then
    raise exception 'Evento no encontrado';
  end if;

  if v_event.status not in ('published', 'active') then
    raise exception 'Evento no disponible para consulta';
  end if;

  return query
  select
    p.first_name,
    p.last_name,
    p.document_id,
    p.email,
    r.qr_token,
    r.certificate_code
  from public.registrations r
  join public.participants p on p.id = r.participant_id
  where r.event_id = p_event_id
    and p.document_id = trim(p_document_id)
    and r.certificate_code = upper(trim(p_certificate_code))
  limit 1;
end;
$$;

grant execute on function public.lookup_participant_registration(uuid, text, text) to anon, authenticated;


-- Restrictive policies also constrain older permissive policies regardless of migration order.
drop policy if exists registrations_org_guard on public.registrations;
create policy registrations_org_guard on public.registrations as restrictive for all to authenticated
using (exists (select 1 from public.events e where e.id = registrations.event_id and e.organization_id = public.current_profile_organization_id()))
with check (exists (select 1 from public.events e join public.participants p on p.id = registrations.participant_id where e.id = registrations.event_id and e.organization_id = public.current_profile_organization_id() and p.organization_id = e.organization_id));
drop policy if exists attendance_org_guard on public.attendance_records;
create policy attendance_org_guard on public.attendance_records as restrictive for all to authenticated
using (exists (select 1 from public.events e where e.id = attendance_records.event_id and e.organization_id = public.current_profile_organization_id()))
with check (exists (select 1 from public.events e join public.registrations r on r.event_id = e.id where e.id = attendance_records.event_id and r.id = attendance_records.registration_id and e.organization_id = public.current_profile_organization_id()));
revoke all on function public.lookup_participant_registration(uuid, text) from public, anon, authenticated;
revoke all on function public.public_event_check_in(uuid, text, text, text, text, jsonb) from public;
revoke all on function public.record_daily_attendance(uuid, text, text) from public, anon;
revoke all on function public.admin_assign_staff_profile(uuid, text, text, public.app_role) from public, anon;
revoke all on function public.lookup_participant_registration(uuid, text, text) from public;

drop policy if exists daily_attendance_org_guard on public.attendance_daily_logs;
create policy daily_attendance_org_guard on public.attendance_daily_logs as restrictive for all to authenticated
using (exists (select 1 from public.events e where e.id = attendance_daily_logs.event_id and e.organization_id = public.current_profile_organization_id()))
with check (exists (select 1 from public.events e join public.registrations r on r.event_id = e.id where e.id = attendance_daily_logs.event_id and r.id = attendance_daily_logs.registration_id and e.organization_id = public.current_profile_organization_id()));

commit;
