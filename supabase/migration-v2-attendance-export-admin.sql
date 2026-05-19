-- Ejecutar en Supabase SQL Editor después de schema.sql / APLICAR_EN_SUPABASE.sql

-- Asistencia diaria (congreso: varios días, varias horas de llegada)
create table if not exists public.attendance_daily_logs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  registration_id uuid not null references public.registrations(id) on delete cascade,
  scanned_by uuid references public.profiles(id) on delete set null,
  checked_in_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists attendance_daily_logs_event_idx
  on public.attendance_daily_logs (event_id, checked_in_at desc);

create index if not exists attendance_daily_logs_registration_idx
  on public.attendance_daily_logs (registration_id, checked_in_at desc);

alter table public.attendance_daily_logs enable row level security;

drop policy if exists "attendance_daily_logs_select_staff" on public.attendance_daily_logs;
create policy "attendance_daily_logs_select_staff"
on public.attendance_daily_logs for select
to authenticated
using (
  public.current_profile_role() in ('admin', 'organizador', 'scanner')
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
  public.current_profile_role() in ('admin', 'organizador', 'scanner')
  and exists (
    select 1 from public.events e
    where e.id = attendance_daily_logs.event_id
      and e.organization_id = public.current_profile_organization_id()
  )
);

-- RPC: marcar asistencia del día (QR o cédula)
drop function if exists public.record_daily_attendance(uuid, text);

create or replace function public.record_daily_attendance(
  p_event_id uuid,
  p_lookup text
)
returns table (
  result_participant_name text,
  result_document_id text,
  result_certificate_code text,
  result_checked_in_at timestamptz,
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
  v_already boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Debe iniciar sesión para escanear asistencia';
  end if;

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

  select * into v_participant from public.participants where id = v_registration.participant_id;

  v_already := exists (
    select 1
    from public.attendance_daily_logs l
    where l.registration_id = v_registration.id
      and l.checked_in_at::date = v_checked_in_at::date
  );

  insert into public.attendance_daily_logs (
    event_id,
    registration_id,
    scanned_by,
    checked_in_at
  )
  values (
    p_event_id,
    v_registration.id,
    auth.uid(),
    v_checked_in_at
  );

  return query select
    trim(v_participant.first_name || ' ' || v_participant.last_name),
    v_participant.document_id,
    v_registration.certificate_code,
    v_checked_in_at,
    v_already;
end;
$$;

grant execute on function public.record_daily_attendance(uuid, text) to authenticated;

-- Actualizar check-in público para devolver qr_token
drop function if exists public.public_event_check_in(uuid, text, text, text, text);
drop function if exists public.public_event_check_in(uuid, text, text, text, text, jsonb);

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
  v_registration public.registrations%rowtype;
  v_attendance_id uuid;
  v_already_checked_in boolean := false;
  v_staff_bypass boolean := false;
begin
  select * into v_event from public.events where id = p_event_id;

  if not found then
    raise exception 'Evento no encontrado';
  end if;

  if v_event.status in ('published', 'active') then
    null;
  elsif auth.uid() is not null and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.organization_id = v_event.organization_id
      and p.role in ('admin', 'organizador')
  ) then
    v_staff_bypass := true;
  else
    raise exception 'Evento no disponible para registro';
  end if;

  insert into public.participants (
    organization_id, first_name, last_name, email, document_id, institution, metadata
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
  on conflict (organization_id, document_id)
  do update set
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    email = excluded.email,
    institution = coalesce(nullif(excluded.institution, ''), public.participants.institution),
    metadata = public.participants.metadata || excluded.metadata
  returning id into v_participant_id;

  insert into public.registrations (event_id, participant_id, checked_in_at)
  values (p_event_id, v_participant_id, now())
  on conflict (event_id, participant_id)
  do update set checked_in_at = coalesce(public.registrations.checked_in_at, now())
  returning * into v_registration;

  v_already_checked_in := exists (
    select 1 from public.attendance_records where registration_id = v_registration.id
  );

  insert into public.attendance_records (
    event_id, registration_id, scanned_by, status, checked_in_at, device_meta
  )
  values (
    p_event_id,
    v_registration.id,
    v_event.organizer_id,
    'present',
    coalesce(v_registration.checked_in_at, now()),
    jsonb_build_object(
      'source',
      case when v_staff_bypass then 'staff_manual_form' else 'public_qr_form' end
    )
  )
  on conflict (registration_id)
  do update set checked_in_at = public.attendance_records.checked_in_at
  returning id into v_attendance_id;

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

-- Crear usuarios administrativos (perfil tras signUp desde la app)
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
    raise exception 'Tu usuario admin no tiene organización asignada';
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

drop policy if exists "profiles_insert_admin" on public.profiles;
create policy "profiles_insert_admin"
on public.profiles for insert
to authenticated
with check (
  public.current_profile_role() = 'admin'
  and organization_id = public.current_profile_organization_id()
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
