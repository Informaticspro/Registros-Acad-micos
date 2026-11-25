begin;
alter table public.laboratory_requests
 add column if not exists applicant_details text not null default ''
 check (length(applicant_details) <= 500);

create or replace function public.submit_laboratory_request(p_org uuid, p_receipt uuid, p_data jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_start timestamptz; v_end timestamptz; v_existing public.laboratory_requests;
 v_details text := coalesce(trim(p_data->>'applicantDetails'),''); v_loan uuid;
begin
 if p_org is null or p_receipt is null or not exists(select 1 from organizations where id=p_org) then raise exception 'Enlace no disponible.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_org::text, 0));
 select * into v_existing from laboratory_requests where receipt=p_receipt;
 if found then
   if v_existing.organization_id <> p_org then raise exception 'Código no válido.'; end if;
   return p_receipt;
 end if;
 if length(v_details)>500 then raise exception 'Los datos adicionales admiten hasta 500 caracteres.'; end if;
 if p_data is null or coalesce(p_data->>'accepted','') <> 'true'
 or coalesce(length(trim(p_data->>'name')),0) not between 2 and 120
 or coalesce(length(trim(p_data->>'affiliation')),0) not between 2 and 120
 or coalesce(length(trim(p_data->>'equipment')),0) not between 2 and 120
 or coalesce(length(trim(p_data->>'room')),0) not between 1 and 100 then raise exception 'Complete nombre, equipo, aula y confirmación.'; end if;
 v_start := (p_data->>'startsAt')::timestamptz; v_end := (p_data->>'endsAt')::timestamptz;
 if v_start is null or not isfinite(v_start) or v_start < now()-interval '1 day' or v_start > now()+interval '90 days' or (v_end is not null and (not isfinite(v_end) or v_end <= v_start or v_end > v_start+interval '7 days')) then raise exception 'Revise el horario solicitado.'; end if;
 if (select count(*) from laboratory_requests where organization_id=p_org and created_at > now()-interval '1 hour' and lower(applicant)=lower(trim(p_data->>'name'))) >= 10
 or (select count(*) from laboratory_requests where organization_id=p_org and created_at > now()-interval '1 day') >= 1000 then raise exception 'Límite de solicitudes alcanzado. Consulte al personal.'; end if;
 insert into laboratory_requests(receipt,organization_id,applicant,affiliation,equipment,room,starts_at,ends_at,applicant_details)
 values(p_receipt,p_org,trim(p_data->>'name'),trim(p_data->>'affiliation'),trim(p_data->>'equipment'),trim(p_data->>'room'),v_start,v_end,v_details)
 returning loan_id into v_loan;
 if v_details <> '' and v_loan is not null then
   update laboratory_loans set notes=coalesce(notes,'') || E'\nDatos adicionales del solicitante: ' || v_details
   where id=v_loan and organization_id=p_org;
 end if;
 return p_receipt;
end $$;
revoke all on function public.submit_laboratory_request(uuid,uuid,jsonb) from public;
grant execute on function public.submit_laboratory_request(uuid,uuid,jsonb) to anon,authenticated;
notify pgrst,'reload schema';
commit;
