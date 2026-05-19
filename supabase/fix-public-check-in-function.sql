drop function if exists public.public_event_check_in(uuid, text, text, text, text);
drop function if exists public.public_event_check_in(uuid, text, text, text, text, jsonb);

create function public.public_event_check_in(
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
begin
  select *
  into v_event
  from public.events
  where id = p_event_id
    and status in ('published', 'active');

  if not found then
    raise exception 'Evento no disponible para registro';
  end if;

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
  on conflict (organization_id, document_id)
  do update set
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    email = excluded.email,
    institution = coalesce(nullif(excluded.institution, ''), public.participants.institution),
    metadata = public.participants.metadata || excluded.metadata
  returning id into v_participant_id;

  insert into public.registrations (
    event_id,
    participant_id,
    checked_in_at
  )
  values (
    p_event_id,
    v_participant_id,
    now()
  )
  on conflict (event_id, participant_id)
  do update set checked_in_at = coalesce(public.registrations.checked_in_at, now())
  returning * into v_registration;

  v_already_checked_in := exists (
    select 1
    from public.attendance_records
    where registration_id = v_registration.id
  );

  insert into public.attendance_records (
    event_id,
    registration_id,
    scanned_by,
    status,
    checked_in_at,
    device_meta
  )
  values (
    p_event_id,
    v_registration.id,
    v_event.organizer_id,
    'present',
    coalesce(v_registration.checked_in_at, now()),
    jsonb_build_object('source', 'public_qr_form')
  )
  on conflict (registration_id)
  do update set checked_in_at = public.attendance_records.checked_in_at
  returning id into v_attendance_id;

  return query select
    v_participant_id,
    v_registration.id,
    v_attendance_id,
    v_registration.certificate_code,
    v_already_checked_in;
end;
$$;

grant execute on function public.public_event_check_in(uuid, text, text, text, text, jsonb) to anon, authenticated;
