-- Consulta pública de QR por cédula (eventos publicados/activos)
drop function if exists public.lookup_participant_registration(uuid, text);

create or replace function public.lookup_participant_registration(
  p_event_id uuid,
  p_document_id text
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
  limit 1;
end;
$$;

grant execute on function public.lookup_participant_registration(uuid, text) to anon, authenticated;
