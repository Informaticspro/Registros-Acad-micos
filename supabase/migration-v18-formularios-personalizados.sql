alter table public.events
  add column if not exists custom_form_schema jsonb;

comment on column public.events.custom_form_schema is
  'Configuracion JSON para formularios personalizados por evento.';
