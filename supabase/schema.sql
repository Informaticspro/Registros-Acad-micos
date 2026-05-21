create extension if not exists "pgcrypto";

create type public.app_role as enum ('propietario', 'admin', 'organizador', 'scanner');
create type public.event_type as enum ('seminario', 'congreso', 'taller', 'capacitacion', 'universitario');
create type public.event_status as enum ('draft', 'published', 'active', 'closed', 'archived');
create type public.attendance_status as enum ('present', 'late', 'excused');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  full_name text not null,
  email text not null unique,
  role public.app_role not null default 'scanner',
  created_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  organizer_id uuid not null references public.profiles(id) on delete restrict,
  title text not null,
  event_type public.event_type not null,
  description text not null default '',
  location text not null,
  starts_at timestamptz,
  ends_at timestamptz,
  capacity integer not null check (capacity > 0),
  status public.event_status not null default 'draft',
  certificate_template jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.participants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text not null,
  document_id text not null,
  institution text not null default '',
  phone text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (organization_id, document_id),
  unique (organization_id, email)
);

create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  qr_token text not null unique default encode(gen_random_bytes(32), 'hex'),
  certificate_code text not null unique default upper(encode(gen_random_bytes(8), 'hex')),
  checked_in_at timestamptz,
  created_at timestamptz not null default now(),
  unique (event_id, participant_id)
);

create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  registration_id uuid not null references public.registrations(id) on delete cascade,
  scanned_by uuid not null references public.profiles(id) on delete restrict,
  status public.attendance_status not null default 'present',
  checked_in_at timestamptz not null default now(),
  device_meta jsonb not null default '{}'::jsonb,
  unique (registration_id)
);

create table public.certificate_issues (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null unique references public.registrations(id) on delete cascade,
  issued_by uuid references public.profiles(id) on delete set null,
  file_url text,
  verification_code text not null unique,
  issued_at timestamptz not null default now()
);

create index events_organization_idx on public.events (organization_id);
create index events_starts_at_idx on public.events (starts_at);
create index participants_organization_idx on public.participants (organization_id);
create index registrations_event_idx on public.registrations (event_id);
create index attendance_event_idx on public.attendance_records (event_id);

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.participants enable row level security;
alter table public.registrations enable row level security;
alter table public.attendance_records enable row level security;
alter table public.certificate_issues enable row level security;

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
using (
  organization_id = public.current_profile_organization_id()
);

create policy "events_read_public_published"
on public.events for select
to anon
using (status in ('published', 'active'));

create policy "events_insert_admin_organizer"
on public.events for insert
to authenticated
with check (
  public.current_profile_role() in ('propietario', 'admin', 'organizador')
  and organization_id = public.current_profile_organization_id()
  and organizer_id = auth.uid()
);

create policy "events_update_admin_organizer"
on public.events for update
to authenticated
using (
  public.current_profile_role() in ('propietario', 'admin', 'organizador')
  and organization_id = public.current_profile_organization_id()
)
with check (
  public.current_profile_role() in ('propietario', 'admin', 'organizador')
  and organization_id = public.current_profile_organization_id()
);

create policy "events_delete_admin_organizer"
on public.events for delete
to authenticated
using (
  public.current_profile_role() in ('propietario', 'admin')
  and organization_id = public.current_profile_organization_id()
);

create policy "participants_select_admin_organizer"
on public.participants for select
to authenticated
using (
  public.current_profile_role() in ('propietario', 'admin', 'organizador')
  and organization_id = public.current_profile_organization_id()
);

create policy "participants_insert_admin_organizer"
on public.participants for insert
to authenticated
with check (
  public.current_profile_role() in ('propietario', 'admin', 'organizador')
  and organization_id = public.current_profile_organization_id()
);

create policy "participants_update_admin_organizer"
on public.participants for update
to authenticated
using (
  public.current_profile_role() in ('propietario', 'admin', 'organizador')
  and organization_id = public.current_profile_organization_id()
)
with check (
  public.current_profile_role() in ('propietario', 'admin', 'organizador')
  and organization_id = public.current_profile_organization_id()
);

create policy "participants_delete_admin"
on public.participants for delete
to authenticated
using (
  public.current_profile_role() in ('propietario', 'admin')
  and organization_id = public.current_profile_organization_id()
);

create policy "registrations_manage_admin_organizer"
on public.registrations for all
to authenticated
using (public.current_profile_role() in ('propietario', 'admin', 'organizador'))
with check (public.current_profile_role() in ('propietario', 'admin', 'organizador'));

create policy "attendance_manage_scanners"
on public.attendance_records for all
to authenticated
using (public.current_profile_role() in ('propietario', 'admin', 'organizador', 'scanner'))
with check (public.current_profile_role() in ('propietario', 'admin', 'organizador', 'scanner'));

create policy "certificates_read_own_org"
on public.certificate_issues for select
to authenticated
using (
  exists (
    select 1
    from public.registrations r
    join public.events e on e.id = r.event_id
    join public.profiles p on p.id = auth.uid()
    where r.id = certificate_issues.registration_id
      and e.organization_id = p.organization_id
  )
);

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
  select *
  into v_event
  from public.events
  where id = p_event_id;

  if not found then
    raise exception 'Evento no encontrado';
  end if;

  if v_event.status in ('published', 'active') then
    null;
  elsif auth.uid() is not null and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.organization_id = v_event.organization_id
      and p.role in ('propietario', 'admin', 'organizador')
  ) then
    v_staff_bypass := true;
  else
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
