-- Ejecutar en Supabase SQL Editor despues de migration-v4-asistencia-congreso-jornadas.sql.
-- Evita duplicar asistencia del mismo participante en la misma jornada y dia.

drop function if exists public.record_daily_attendance(uuid, text);
drop function if exists public.record_daily_attendance(uuid, text, text);

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
    hashtext(v_registration.id::text || ':' || v_period || ':' || v_checked_in_at::date::text)
  );

  select l.checked_in_at
  into v_existing_checked_in_at
  from public.attendance_daily_logs l
  where l.registration_id = v_registration.id
    and l.attendance_period = v_period
    and l.checked_in_at::date = v_checked_in_at::date
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
