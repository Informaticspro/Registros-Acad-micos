begin;
alter table public.laboratory_technical_sheets add column if not exists equipment_id uuid references public.laboratory_equipment(id) on delete set null;
create index if not exists laboratory_sheets_equipment_idx on public.laboratory_technical_sheets(equipment_id,sheet_date desc);

-- Vincular fichas antiguas únicamente cuando la coincidencia no es ambigua.
with candidates as (
 select s.id as sheet_id,e.id as equipment_id
 from public.laboratory_technical_sheets s join public.laboratory_equipment e on e.organization_id=s.organization_id
 where s.equipment_id is null and (
   (lower(trim(s.pc))=lower(trim(e.name)) and lower(trim(s.location))=lower(trim(e.location)))
   or (lower(trim(e.code)) not in ('','n/a','na','s/n','sin inventario')
     and exists(select 1 from jsonb_array_elements(s.inventory) i where lower(trim(i->>'numero'))=lower(trim(e.code)))
     and (select count(*) from public.laboratory_equipment e2 where e2.organization_id=e.organization_id and lower(trim(e2.code))=lower(trim(e.code)))=1)
 )
), unique_matches as (select sheet_id,min(equipment_id::text)::uuid as equipment_id from candidates group by sheet_id having count(*)=1)
update public.laboratory_technical_sheets s set equipment_id=m.equipment_id from unique_matches m where s.id=m.sheet_id;

create or replace function public.record_equipment_software(p_equipment uuid,p_request uuid,p_action text,p_name text,p_version text default '',p_description text default '')
returns uuid language plpgsql security definer set search_path=public as $$
declare v_org uuid; v_equipment public.laboratory_equipment; v_sheet public.laboratory_technical_sheets;
 v_log public.laboratory_logs; v_apps jsonb; v_previous jsonb; v_app jsonb; v_responsible text; v_type text; v_description text; v_version text;
begin
 v_org:=current_profile_organization_id();
 if v_org is null or coalesce(current_profile_role()::text,'') not in ('propietario','admin','soporte') then raise exception 'Sin permiso para registrar programas.'; end if;
 if p_request is null or coalesce(p_action,'') not in ('instalar','actualizar','retirar') or coalesce(length(trim(p_name)),0) not between 1 and 120
 or length(coalesce(p_version,''))>160 or length(coalesce(p_description,''))>5000 then raise exception 'Revise el programa y su descripción.'; end if;
 p_name:=trim(p_name); p_version:=trim(coalesce(p_version,'')); p_description:=trim(coalesce(p_description,''));
 select * into v_equipment from laboratory_equipment where id=p_equipment and organization_id=v_org for update;
 if not found then raise exception 'Equipo no encontrado.'; end if;
 v_type:=case p_action when 'instalar' then 'Instalación de software' when 'actualizar' then 'Actualización de software' else 'Retiro de software' end;
 v_description:=v_type||': '||p_name||case when p_version<>'' then ' · Versión: '||p_version else '' end||case when p_description<>'' then E'\n\n'||p_description else '' end;
 select * into v_log from laboratory_logs where id=p_request;
 if found then
  if v_log.organization_id is distinct from v_org or v_log.equipment_id is distinct from p_equipment or v_log.created_by is distinct from auth.uid() or v_log.description<>v_description or v_log.work_type<>v_type then raise exception 'Identificador de operación no válido.'; end if;
  return p_request;
 end if;
 select * into v_sheet from laboratory_technical_sheets where equipment_id=p_equipment and organization_id=v_org order by sheet_date desc,updated_at desc,id desc limit 1 for update;
 v_apps:=coalesce(v_sheet.applications,'[]'::jsonb);
 select app into v_previous from jsonb_array_elements(v_apps) app where lower(trim(app->>'nombre'))=lower(p_name) limit 1;
 if p_action in ('actualizar','retirar') and coalesce((v_previous->>'instalada')::boolean,false)=false then raise exception 'Ese programa no figura como instalado. Registre primero su instalación.'; end if;
 if p_action='instalar' and coalesce((v_previous->>'instalada')::boolean,false) then raise exception 'El programa ya está instalado. Utilice Actualizar programa.'; end if;
 v_version:=case when p_action='retirar' or p_version='' then coalesce(v_previous->>'observacion','') else p_version end;
 v_app:=jsonb_build_object('nombre',coalesce(v_previous->>'nombre',p_name),'instalada',p_action<>'retirar','observacion',v_version);
 select coalesce(jsonb_agg(app),'[]'::jsonb) into v_apps from jsonb_array_elements(v_apps) app where lower(trim(app->>'nombre'))<>lower(p_name);
 v_apps:=v_apps||jsonb_build_array(v_app);
 select coalesce(nullif(full_name,''),'Soporte técnico') into v_responsible from profiles where id=auth.uid();
 if v_sheet.id is null then
  insert into laboratory_technical_sheets(organization_id,equipment_id,pc,location,responsible,applications,inventory,created_by)
  values(v_org,p_equipment,v_equipment.name,v_equipment.location,v_responsible,v_apps,jsonb_build_array(jsonb_build_object('equipo',v_equipment.name,'numero',v_equipment.code)),auth.uid());
 else
  update laboratory_technical_sheets set applications=v_apps,updated_at=now() where id=v_sheet.id;
 end if;
 insert into laboratory_logs(id,organization_id,equipment_id,work_date,work_type,title,description,responsible,priority,status,entry_type,target_equipment,location,created_by)
 values(p_request,v_org,p_equipment,now(),v_type,v_type||' · '||p_name,v_description,v_responsible,'media','cerrado','mantenimiento',v_equipment.code||' - '||v_equipment.name,v_equipment.location,auth.uid());
 return p_request;
end $$;
revoke all on function public.record_equipment_software(uuid,uuid,text,text,text,text) from public,anon;
grant execute on function public.record_equipment_software(uuid,uuid,text,text,text,text) to authenticated;
notify pgrst,'reload schema';
commit;
