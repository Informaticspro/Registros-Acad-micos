alter table public.events
  add column if not exists registration_form_type text;

update public.events
set registration_form_type =
  case
    when lower(title) like '%informatica intermedia%'
      or lower(title) like '%informática intermedia%'
      or lower(title) like '%posgrado%'
      or lower(title) like '%maestria%'
      or lower(title) like '%maestría%'
      then 'educacion_continua'
    else 'seminario_general'
  end
where event_type = 'seminario'
  and registration_form_type is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'events_registration_form_type_check'
  ) then
    alter table public.events
      add constraint events_registration_form_type_check
      check (
        registration_form_type is null
        or registration_form_type in ('educacion_continua', 'seminario_general')
      );
  end if;
end $$;

comment on column public.events.registration_form_type is
  'Define que formulario publico usa un seminario: educacion_continua o seminario_general.';
