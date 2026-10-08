begin;
create table if not exists public.laboratory_requests (
 id uuid primary key default gen_random_uuid(),
 receipt uuid not null unique,
 organization_id uuid not null references public.organizations(id),
 applicant text not null check(length(applicant) between 2 and 120),
 affiliation text not null check(length(affiliation) between 2 and 120),
 equipment text not null check(length(equipment) between 2 and 120),
 room text not null check(length(room) between 1 and 100),
 starts_at timestamptz not null,
 ends_at timestamptz not null check(ends_at > starts_at),
 status text not null default 'pendiente' check(status in ('pendiente','entregado','devuelto','cancelado')),
 loan_id uuid references public.laboratory_loans(id),
 created_at timestamptz not null default now(),
 delivered_at timestamptz, returned_at timestamptz,
 handled_by uuid references auth.users(id)
);
alter table public.laboratory_requests enable row level security;
revoke all on public.laboratory_requests from anon, authenticated;
create index if not exists laboratory_requests_org_date on public.laboratory_requests(organization_id,created_at desc);

create or replace function public.submit_laboratory_request(p_org uuid, p_receipt uuid, p_data jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_start timestamptz; v_end timestamptz; v_existing public.laboratory_requests;
begin
 if p_org is null or p_receipt is null or not exists(select 1 from organizations where id=p_org) then raise exception 'Enlace no disponible.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_org::text, 0));
 select * into v_existing from laboratory_requests where receipt=p_receipt;
 if found then
   if v_existing.organization_id <> p_org then raise exception 'Código no válido.'; end if;
   return p_receipt;
 end if;
 if p_data is null or coalesce(p_data->>'accepted','') <> 'true'
 or coalesce(length(trim(p_data->>'name')),0) not between 2 and 120
 or coalesce(length(trim(p_data->>'affiliation')),0) not between 2 and 120
 or coalesce(length(trim(p_data->>'equipment')),0) not between 2 and 120
 or coalesce(length(trim(p_data->>'room')),0) not between 1 and 100 then raise exception 'Complete nombre, equipo, aula y confirmación.'; end if;
 v_start := (p_data->>'startsAt')::timestamptz; v_end := (p_data->>'endsAt')::timestamptz;
 if v_start is null or v_end is null or not isfinite(v_start) or not isfinite(v_end) or v_start < now()-interval '1 day' or v_start > now()+interval '90 days' or v_end <= v_start or v_end > v_start+interval '7 days' then raise exception 'Revise el horario solicitado.'; end if;
 if (select count(*) from laboratory_requests where organization_id=p_org and created_at > now()-interval '1 hour' and lower(applicant)=lower(trim(p_data->>'name'))) >= 10
 or (select count(*) from laboratory_requests where organization_id=p_org and created_at > now()-interval '1 day') >= 1000 then raise exception 'Límite de solicitudes alcanzado. Consulte al personal.'; end if;
 insert into laboratory_requests(receipt,organization_id,applicant,affiliation,equipment,room,starts_at,ends_at)
 values(p_receipt,p_org,trim(p_data->>'name'),trim(p_data->>'affiliation'),trim(p_data->>'equipment'),trim(p_data->>'room'),v_start,v_end);
 return p_receipt;
end $$;

create or replace function public.manage_laboratory_requests(p_action text default 'list',p_id uuid default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_org uuid; v_row public.laboratory_requests; v_loan uuid; v_name text;
begin
 v_org := current_profile_organization_id();
 if v_org is null or coalesce(current_profile_role()::text,'') not in ('propietario','admin','soporte') then raise exception 'Sin permiso para gestionar préstamos.'; end if;
 if p_action='list' then
 return coalesce((select jsonb_agg(to_jsonb(r)-'receipt' order by r.created_at desc) from (select * from laboratory_requests where organization_id=v_org order by created_at desc limit 200) r),'[]'::jsonb);
 end if;
 select * into v_row from laboratory_requests where id=p_id and organization_id=v_org for update;
 if not found then raise exception 'Solicitud no encontrada.'; end if;
 select full_name into v_name from profiles where id=auth.uid();
 if p_action='deliver' and v_row.status='pendiente' then
 insert into laboratory_loans(organization_id,equipment,delivered_to,beneficiary_type,delivered_by,loaned_at,status,notes,created_by)
 values(v_org,v_row.equipment,v_row.applicant,'externo',coalesce(v_name,'Soporte'),now(),'activo',
 'Solicitud pública. Procedencia: '||v_row.affiliation||'. Aula: '||v_row.room||'. Uso previsto: '||v_row.starts_at||' hasta '||v_row.ends_at,auth.uid()) returning id into v_loan;
 update laboratory_requests set status='entregado',loan_id=v_loan,handled_by=auth.uid(),delivered_at=now() where id=p_id;
 elsif p_action='return' and v_row.status='entregado' then
 update laboratory_loans set status='devuelto',returned_at=now() where id=v_row.loan_id and organization_id=v_org;
 update laboratory_requests set status='devuelto',returned_at=now(),handled_by=auth.uid() where id=p_id;
 elsif p_action='cancel' and v_row.status='pendiente' then
 update laboratory_requests set status='cancelado',handled_by=auth.uid() where id=p_id;
 else raise exception 'La solicitud ya cambió de estado. Actualice la lista.';
 end if;
 return jsonb_build_object('ok',true);
end $$;
revoke all on function public.submit_laboratory_request(uuid,uuid,jsonb) from public;
revoke all on function public.manage_laboratory_requests(text,uuid) from public;
grant execute on function public.submit_laboratory_request(uuid,uuid,jsonb) to anon,authenticated;
grant execute on function public.manage_laboratory_requests(text,uuid) to authenticated;
notify pgrst,'reload schema';
commit;
