begin;
-- Una solicitud confirmada ya representa el préstamo en recepción.
-- El préstamo vinculado permite devolver desde recepción o desde soporte.
create or replace function public.activate_reception_loan()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_actor uuid; v_time timestamptz;
begin
 if new.status <> 'pendiente' or new.loan_id is not null then return new; end if;
 v_time := coalesce(new.created_at, now());
 select id into v_actor from profiles where id=auth.uid() and organization_id=new.organization_id;
 insert into laboratory_loans(organization_id,equipment,delivered_to,beneficiary_type,delivered_by,loaned_at,status,notes,created_by)
 values(new.organization_id,new.equipment,new.applicant,'externo','Registro automático en recepción',v_time,'activo',
 'Préstamo registrado en recepción. Procedencia: '||new.affiliation||'. Aula: '||new.room,v_actor)
 returning id into new.loan_id;
 new.status := 'entregado';
 new.delivered_at := v_time;
 new.handled_by := v_actor;
 return new;
end $$;
revoke all on function public.activate_reception_loan() from public,anon,authenticated;
drop trigger if exists activate_reception_loan on public.laboratory_requests;
create trigger activate_reception_loan before insert or update of status on public.laboratory_requests
for each row execute function public.activate_reception_loan();
-- Incorporar las solicitudes pendientes de esta facultad al flujo solicitado.
update public.laboratory_requests set status='pendiente'
where organization_id='5cfef193-6c1c-47e6-9a9c-7f9f6ab09fe5' and status='pendiente' and loan_id is null;
notify pgrst,'reload schema';
commit;
