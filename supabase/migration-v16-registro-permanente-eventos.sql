alter table public.events
  add column if not exists is_permanent boolean not null default false;

update public.events
set
  is_permanent = true,
  status = case when status = 'closed' then 'published'::public.event_status else status end,
  updated_at = now()
where event_type = 'seminario'
  and (
    lower(title) like '%educacion continua%'
    or lower(title) like '%educación continua%'
    or lower(title) like '%informatica intermedia%'
    or lower(title) like '%informática intermedia%'
    or lower(title) like '%posgrado%'
    or lower(title) like '%maestria%'
    or lower(title) like '%maestría%'
  );

comment on column public.events.is_permanent is
  'Indica que el registro publico permanece disponible y no se cierra automaticamente por fecha.';
