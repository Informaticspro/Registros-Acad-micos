update public.events
set
  is_permanent = true,
  capacity = greatest(capacity, 9999),
  status = case when status = 'closed' then 'published'::public.event_status else status end,
  updated_at = now()
where event_type = 'seminario'
  and (
    registration_form_type = 'educacion_continua'
    or translate(lower(title || ' ' || coalesce(description, '')), 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU') like '%educacion continua%'
    or translate(lower(title || ' ' || coalesce(description, '')), 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU') like '%informatica intermedia%'
    or translate(lower(title || ' ' || coalesce(description, '')), 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU') like '%posgrado%'
    or translate(lower(title || ' ' || coalesce(description, '')), 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU') like '%maestria%'
  );
